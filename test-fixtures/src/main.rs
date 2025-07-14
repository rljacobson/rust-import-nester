mod messy;

use rand::thread_rng;
use std::collections::HashMap;
use std::io::Write;
use std::cmp::Ordering;
use crate::config::AppConfig;
use std::fs::File;
use serde_json::Value;
use std::env;
use std::env;
use std::env;
use std::env;
use std::time::{Duration, Instant};
use serde::Deserialize;
use tokio::time::sleep;
use crate::utils::format_date;
use std::sync::{Arc, Mutex};
use std::path::PathBuf;
use std::io::BufReader;
use anyhow::Result;


fn main() -> Result<()> {
    let config = AppConfig::load()?;
    println!("Loaded config: {:?}", config);
    Ok(())
}
