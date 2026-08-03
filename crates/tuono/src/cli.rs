use clap::{Parser, Subcommand, ValueEnum};
use colored::Colorize;
use spinners::{Spinner, Spinners};
use tracing::{Level, span};
use tuono_internal::config::OutputMode;

use crate::commands::new::NewOptions;
use crate::commands::{build, dev, new};
use crate::mode::Mode;
use crate::source_builder::SourceBuilder;

/// CLI spelling of [`OutputMode`], for `tuono new --output`.
#[derive(ValueEnum, Clone, Copy, Debug)]
enum OutputArg {
    Static,
    Server,
}

impl From<OutputArg> for OutputMode {
    fn from(arg: OutputArg) -> Self {
        match arg {
            OutputArg::Static => OutputMode::Static,
            OutputArg::Server => OutputMode::Server,
        }
    }
}

#[derive(Subcommand, Debug)]
enum Actions {
    /// Start the development environment
    Dev,
    /// Build the production assets
    Build {
        #[arg(short, long = "static", conflicts_with = "server")]
        /// Statically generate the website HTML (overrides `output` in the config)
        r#static: bool,

        #[arg(long)]
        /// Build the SSR server (overrides `output` in the config)
        server: bool,

        #[arg(short, long)]
        /// Prevent to export the js assets
        no_js_emit: bool,
    },
    /// Scaffold a new project
    New {
        /// The folder in which load the project. Default is the current directory.
        folder_name: Option<String>,
        /// The template to use to scaffold the project. The template should match one of the tuono
        /// examples. When set, the interactive wizard and feature flags are skipped.
        #[arg(short, long)]
        template: Option<String>,
        /// Load the latest commit available on the main branch
        #[arg(long)]
        head: Option<bool>,
        /// Include Tailwind CSS (preselects it in the wizard, or enables it with --yes)
        #[arg(long)]
        tailwind: bool,
        /// Include MDX (preselects it in the wizard, or enables it with --yes)
        #[arg(long)]
        mdx: bool,
        /// Default build output mode
        #[arg(long, value_enum)]
        output: Option<OutputArg>,
        /// Skip the interactive wizard, accepting defaults and the given flags
        #[arg(short = 'y', long)]
        yes: bool,
    },
}

#[derive(Parser, Debug)]
#[command(version, about = "The React/Rust full-stack framework")]
struct Args {
    #[command(subcommand)]
    action: Actions,
}

pub fn app() -> std::io::Result<()> {
    let args = Args::parse();

    match args.action {
        Actions::Dev => {
            let span = span!(Level::TRACE, "DEV");

            let _guard = span.enter();

            // Validate the project (this emits the "not a tuono project" error
            // and bails) *before* printing any startup UI, so a non-project
            // directory fails cleanly with just the error.
            let mut source_builder = SourceBuilder::new(Mode::Dev)?;

            // A persistent header, then a checklist: scaffolding (codegen +
            // config build) and type generation are the first items;
            // `dev::watch` ticks the rest (compile / bundle / start) below it.
            let tick = "✔".green().to_string();
            println!("Running dev server...\n");

            let mut scaffold_sp = Spinner::new(Spinners::Dots, "Scaffolding project".into());
            source_builder.base_build()?;
            scaffold_sp.stop_and_persist(&tick, "Scaffolding project".into());

            let mut types_sp = Spinner::new(Spinners::Dots, "Generating types".into());
            source_builder.generate_typescript_file()?;
            types_sp.stop_and_persist(&tick, "Generating types".into());

            source_builder.app.check_server_availability(Mode::Dev);

            dev::watch(source_builder).unwrap();
        }
        Actions::Build {
            r#static,
            server,
            no_js_emit,
        } => {
            let span = span!(Level::TRACE, "BUILD");

            let _guard = span.enter();

            // Flags override the config's `output`; when neither is passed the
            // config decides (resolved in `build::build` once it is loaded).
            let ssg_override = if r#static {
                Some(true)
            } else if server {
                Some(false)
            } else {
                None
            };

            let mut source_builder = SourceBuilder::new(Mode::Prod)?;
            source_builder.base_build()?;
            source_builder.generate_typescript_file()?;
            build::build(source_builder.app, ssg_override, no_js_emit);
        }
        Actions::New {
            folder_name,
            template,
            head,
            tailwind,
            mdx,
            output,
            yes,
        } => {
            let span = span!(Level::TRACE, "NEW");

            let _guard = span.enter();

            new::create_new_project(NewOptions {
                folder_name,
                template,
                head,
                tailwind,
                mdx,
                output: output.map(OutputMode::from),
                yes,
            });
        }
    }

    Ok(())
}
