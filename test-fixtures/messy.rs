use anyhow::Result;
use crate::config::AppConfig;
use crate::utils::format_date;
use rand::thread_rng;
use serde_json::Value;
use serde::Deserialize;
use std::cmp::Ordering;
use std::collections::HashMap;
use std::env;
use std::fs::File;
use std::io::BufReader;
use std::io::Write;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use tokio::time::sleep;

fn main() -> Result<()> {
    let config = AppConfig::load()?;
    println!("Loaded config: {:?}", config);
    Ok(())
}
