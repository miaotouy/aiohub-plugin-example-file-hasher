use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha224, Sha256, Sha384, Sha512};
use std::fs::File;
use std::io::{self, Read, BufReader, BufRead};

#[derive(Deserialize)]
struct Input {
    method: String,
    params: Params,
}

#[derive(Deserialize)]
struct Params {
    path: String,
    #[serde(default = "default_algorithm")]
    algorithm: String,
}

fn default_algorithm() -> String {
    "sha256".to_string()
}

#[derive(Serialize)]
struct Output {
    #[serde(rename = "type")]
    output_type: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    percent: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    message: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    data: Option<String>,
}

fn send_progress(percent: u32, message: &str) {
    let output = Output {
        output_type: "progress".to_string(),
        percent: Some(percent),
        message: Some(message.to_string()),
        data: None,
    };
    println!("{}", serde_json::to_string(&output).unwrap());
}

fn send_result(hash: &str) {
    let output = Output {
        output_type: "result".to_string(),
        percent: None,
        message: None,
        data: Some(hash.to_string()),
    };
    println!("{}", serde_json::to_string(&output).unwrap());
}

fn send_error(message: &str) {
    let output = Output {
        output_type: "error".to_string(),
        percent: None,
        message: Some(message.to_string()),
        data: None,
    };
    println!("{}", serde_json::to_string(&output).unwrap());
}

fn calculate_file_hash(path: &str, algorithm: &str) -> io::Result<String> {
    send_progress(0, &format!("开始计算哈希值 ({})", algorithm));
    
    let file = File::open(path)?;
    let file_size = file.metadata()?.len();
    let mut reader = BufReader::new(file);
    let mut buffer = [0; 8192];
    let mut total_read = 0u64;
    let mut last_percent = 0u32;

    // 根据算法类型计算哈希值
    let hash = match algorithm.to_lowercase().as_str() {
        "sha224" => {
            let mut hasher = Sha224::new();
            loop {
                let n = reader.read(&mut buffer)?;
                if n == 0 { break; }
                hasher.update(&buffer[..n]);
                total_read += n as u64;
                report_progress(&mut last_percent, total_read, file_size);
            }
            hex::encode(hasher.finalize())
        }
        "sha256" => {
            let mut hasher = Sha256::new();
            loop {
                let n = reader.read(&mut buffer)?;
                if n == 0 { break; }
                hasher.update(&buffer[..n]);
                total_read += n as u64;
                report_progress(&mut last_percent, total_read, file_size);
            }
            hex::encode(hasher.finalize())
        }
        "sha384" => {
            let mut hasher = Sha384::new();
            loop {
                let n = reader.read(&mut buffer)?;
                if n == 0 { break; }
                hasher.update(&buffer[..n]);
                total_read += n as u64;
                report_progress(&mut last_percent, total_read, file_size);
            }
            hex::encode(hasher.finalize())
        }
        "sha512" => {
            let mut hasher = Sha512::new();
            loop {
                let n = reader.read(&mut buffer)?;
                if n == 0 { break; }
                hasher.update(&buffer[..n]);
                total_read += n as u64;
                report_progress(&mut last_percent, total_read, file_size);
            }
            hex::encode(hasher.finalize())
        }
        _ => {
            return Err(io::Error::new(
                io::ErrorKind::InvalidInput,
                format!("不支持的算法: {}", algorithm)
            ));
        }
    };

    send_progress(100, "计算完成");
    Ok(hash)
}

fn report_progress(last_percent: &mut u32, total_read: u64, file_size: u64) {
    let percent = if file_size > 0 {
        ((total_read as f64 / file_size as f64) * 100.0) as u32
    } else {
        100
    };
    
    // 每 10% 报告一次进度
    if percent >= *last_percent + 10 && percent < 100 {
        send_progress(percent, &format!("已处理 {}%", percent));
        *last_percent = percent;
    }
}

fn main() {
    // 从 stdin 读取输入
    let stdin = io::stdin();
    let mut lines = stdin.lock().lines();
    
    if let Some(Ok(line)) = lines.next() {
        match serde_json::from_str::<Input>(&line) {
            Ok(input) => {
                if input.method == "calculateHash" {
                    match calculate_file_hash(&input.params.path, &input.params.algorithm) {
                        Ok(hash) => {
                            send_result(&hash);
                        }
                        Err(e) => {
                            send_error(&format!("计算哈希失败: {}", e));
                        }
                    }
                } else {
                    send_error(&format!("未知方法: {}", input.method));
                }
            }
            Err(e) => {
                send_error(&format!("解析输入失败: {}", e));
            }
        }
    } else {
        send_error("未收到输入");
    }
}
