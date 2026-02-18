// NEXUS Desktop App — Tauri entry point
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

pub fn main() {
    nexus_lib::run()
}
