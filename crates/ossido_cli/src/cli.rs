use clap::{Parser, Subcommand, ValueEnum};
use colored::Colorize;
use ossido_internal::config::OutputMode;
use spinners::{Spinner, Spinners};
use tracing::{Level, span};

use crate::commands::new::NewOptions;
use crate::commands::{build, dev, doctor, new, upgrade};
use crate::mode::Mode;
use crate::source_builder::SourceBuilder;

/// CLI spelling of [`OutputMode`], for `ossido new --output`.
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
        /// The template to use to scaffold the project. The template should match one of the ossido
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
        /// Set up a `src` path alias with this prefix (e.g. `--alias @` maps `@/*` to `./src/*`)
        #[arg(long, value_name = "PREFIX")]
        alias: Option<String>,
        /// Skip the interactive wizard, accepting defaults and the given flags
        #[arg(short = 'y', long)]
        yes: bool,
        /// Do not install the JS dependencies after scaffolding
        #[arg(long)]
        no_install: bool,
    },
    /// Diagnose the project, toolchain, and runtime setup
    Doctor {
        /// Skip network checks (do not query crates.io / npm for the latest version)
        #[arg(long)]
        offline: bool,
    },
    /// Upgrade the project's ossido crate and npm dependencies to a newer version
    Upgrade {
        /// Target version to upgrade to (e.g. 0.1.5). Defaults to the latest published version.
        #[arg(long, value_name = "X.Y.Z")]
        version: Option<String>,
        /// Report the available upgrade without modifying any files
        #[arg(long, visible_alias = "check")]
        dry_run: bool,
        /// Skip the interactive confirmation (non-interactive / CI)
        #[arg(short = 'y', long)]
        yes: bool,
        /// Do not run `cargo update` / package-manager install after rewriting manifests
        #[arg(long)]
        no_install: bool,
    },
}

#[derive(Parser, Debug)]
// The crate is `ossido_cli`, but the installed command is `ossido` — pin the
// program name so `--help`/`--version` show `ossido`, not the crate name.
#[command(
    name = "ossido",
    version,
    about = "The React/Rust full-stack framework"
)]
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

            // Validate the project (this emits the "not a ossido project" error
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
            alias,
            yes,
            no_install,
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
                path_alias: alias,
                yes,
                no_install,
            });
        }
        Actions::Doctor { offline } => {
            let span = span!(Level::TRACE, "DOCTOR");
            let _guard = span.enter();

            // `run` renders the full report, then we exit with its code so a
            // failure is scriptable without truncating the output.
            let code = doctor::run(doctor::DoctorOptions { offline });
            std::process::exit(code);
        }
        Actions::Upgrade {
            version,
            dry_run,
            yes,
            no_install,
        } => {
            let span = span!(Level::TRACE, "UPGRADE");
            let _guard = span.enter();

            upgrade::run(upgrade::UpgradeOptions {
                target_version: version,
                dry_run,
                yes,
                no_install,
            });
        }
    }

    Ok(())
}
