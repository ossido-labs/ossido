//! A transparently-instrumented database handle.
//!
//! [`Db`] wraps the `PgPool` and implements [`sqlx::Executor`], so every query
//! in the app is written as plain sqlx — `sqlx::query_as(..).fetch_all(&db)` —
//! and *automatically* runs inside an OpenTelemetry span following the
//! database [semantic conventions]: `SELECT todos`, `INSERT todos`, … nested
//! under the request's server/handler spans, carrying the query text, the row
//! count, and an `ERROR` status when the query fails. With telemetry off
//! (`OTEL_EXPORTER_OTLP_ENDPOINT` unset) the spans cost nothing.
//!
//! The interception point is [`sqlx::Executor`]: sqlx routes `fetch_all`,
//! `fetch_one`, `fetch_optional`, and `execute` through `fetch_many` /
//! `fetch_optional`, so wrapping those two covers every call shape.
//!
//! [semantic conventions]: https://opentelemetry.io/docs/specs/semconv/database/database-spans/

use std::pin::Pin;
use std::task::{Context, Poll};

use futures_core::future::BoxFuture;
use futures_core::stream::{BoxStream, Stream};
use ossido::tracing::{self, Instrument, Span, field};
use sqlx::postgres::{PgQueryResult, PgRow, PgStatement, PgTypeInfo};
use sqlx::{Describe, Either, Error, Execute, Executor, PgPool, Postgres};

/// The application's database handle: a `PgPool` whose queries are traced.
/// Handlers take `db: Db` (injected from `ApplicationState`) and pass `&db`
/// anywhere sqlx expects an executor.
#[derive(Clone, Debug)]
pub struct Db(pub PgPool);

/// A database span per the OTel semconv, derived from the SQL itself.
/// `db.response.returned_rows` and `otel.status_code` start empty and are
/// recorded as the query resolves.
fn query_span(sql: &str) -> Span {
    let operation = sql
        .split_whitespace()
        .next()
        .unwrap_or("QUERY")
        .to_uppercase();
    // The table name follows FROM / INTO / UPDATE in every query this app
    // runs — good enough for span naming; the full text is attached anyway.
    let target = sql
        .split_whitespace()
        .zip(sql.split_whitespace().skip(1))
        .find(|(word, _)| matches!(word.to_uppercase().as_str(), "FROM" | "INTO" | "UPDATE"))
        .map(|(_, table)| table);
    let name = match target {
        Some(table) => format!("{operation} {table}"),
        None => operation.clone(),
    };

    tracing::info_span!(
        "db.query",
        { "otel.name" } = %name,
        { "db.system.name" } = "postgresql",
        { "db.operation.name" } = %operation,
        { "db.collection.name" } = target,
        { "db.query.text" } = sql,
        { "db.response.returned_rows" } = field::Empty,
        { "otel.status_code" } = field::Empty,
    )
}

/// The `fetch_many` stream with its span entered on every poll; counts rows and
/// records the outcome when the stream ends. `BoxStream` is `Unpin`, so no
/// pin projection is needed.
struct TracedStream<'e> {
    inner: BoxStream<'e, Result<Either<PgQueryResult, PgRow>, Error>>,
    span: Span,
    rows: i64,
}

impl Stream for TracedStream<'_> {
    type Item = Result<Either<PgQueryResult, PgRow>, Error>;

    fn poll_next(self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Option<Self::Item>> {
        let this = self.get_mut();
        let _entered = this.span.enter();
        let polled = this.inner.as_mut().poll_next(cx);
        match &polled {
            Poll::Ready(Some(Ok(Either::Right(_)))) => this.rows += 1,
            Poll::Ready(Some(Ok(Either::Left(result)))) => {
                // A non-SELECT statement: report affected rows instead.
                this.rows += result.rows_affected() as i64;
            }
            Poll::Ready(Some(Err(error))) => {
                this.span.record("otel.status_code", "ERROR");
                tracing::error!("database query failed: {error}");
            }
            Poll::Ready(None) => {
                this.span.record("db.response.returned_rows", this.rows);
            }
            Poll::Pending => {}
        }
        polled
    }
}

impl<'c> Executor<'c> for &Db {
    type Database = Postgres;

    fn fetch_many<'e, 'q: 'e, E>(
        self,
        query: E,
    ) -> BoxStream<'e, Result<Either<PgQueryResult, PgRow>, Error>>
    where
        E: 'q + Execute<'q, Postgres>,
    {
        let span = query_span(query.sql());
        Box::pin(TracedStream {
            inner: (&self.0).fetch_many(query),
            span,
            rows: 0,
        })
    }

    fn fetch_optional<'e, 'q: 'e, E>(self, query: E) -> BoxFuture<'e, Result<Option<PgRow>, Error>>
    where
        E: 'q + Execute<'q, Postgres>,
    {
        let span = query_span(query.sql());
        let inner = (&self.0).fetch_optional(query);
        Box::pin(
            async move {
                let result = inner.await;
                match &result {
                    Ok(row) => {
                        Span::current()
                            .record("db.response.returned_rows", i64::from(row.is_some()));
                    }
                    Err(error) => {
                        Span::current().record("otel.status_code", "ERROR");
                        tracing::error!("database query failed: {error}");
                    }
                }
                result
            }
            .instrument(span),
        )
    }

    // Statement preparation and type description are driver chatter, not app
    // queries — delegate without spans.
    fn prepare_with<'e, 'q: 'e>(
        self,
        sql: &'q str,
        parameters: &'e [PgTypeInfo],
    ) -> BoxFuture<'e, Result<PgStatement<'q>, Error>> {
        (&self.0).prepare_with(sql, parameters)
    }

    #[doc(hidden)]
    fn describe<'e, 'q: 'e>(
        self,
        sql: &'q str,
    ) -> BoxFuture<'e, Result<Describe<Postgres>, Error>> {
        (&self.0).describe(sql)
    }
}
