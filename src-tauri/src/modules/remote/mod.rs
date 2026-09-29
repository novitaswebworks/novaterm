pub mod devcontainer;
pub mod ports;
pub mod ssh;

/// Safely quote a string for interpolation into a shell command by wrapping
/// it in single quotes. The only character special inside single quotes is
/// the single quote itself, which we handle by ending the quoted segment,
/// inserting an escaped single quote (`\'`), and resuming.
///
/// This prevents shell injection via `$`, backticks, `"`, `\`, `!`, `;`,
/// newlines, and all other metacharacters.
///
/// Examples:
///   shell_quote("hello")          => 'hello'
///   shell_quote("it's here")      => 'it'\''s here'
///   shell_quote("$(rm -rf /)")    => '$(rm -rf /)'
pub fn shell_quote(s: &str) -> String {
    let mut q = String::with_capacity(s.len() + 2);
    q.push('\'');
    for c in s.chars() {
        if c == '\'' {
            // End current single-quote segment, insert escaped quote, resume
            q.push_str("'\\''");
        } else {
            q.push(c);
        }
    }
    q.push('\'');
    q
}
