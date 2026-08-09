//! ## Ossido
//! Ossido is a full-stack web framework for building React applications using Rust as the backend with a strong focus on usability and performance.
//!
//! You can find the full documentation at [ossido.dev](https://ossido.dev/)
mod app;
pub mod cli;
mod commands;
mod macro_attr;
mod mode;
mod ossidoignore;
mod process_manager;
mod route;
mod route_directory_info;
mod route_tree;
mod source_builder;
mod symbols;
mod typescript;
