import "dotenv/config";
import { query } from "@anthropic-ai/claude-agent-sdk";
import { renderFetchToFile } from "./render-fetch.js";
import fs from "node:fs/promises";
import path from "node:path";
async function extractPrompts() {
    const readme = await fs.readFile(path.resolve("Readme.md"), "utf8");
    const firstMatch = readme.match(/## First cycle:[\s\S]*?(?=## Second cycle)/);
    const secondSplit = readme.split("## Second cycle");
    const first = (firstMatch?.[0] ?? "")
        .replace(/^## First cycle:\s*/, "")
        .trim();
    const second = (secondSplit[1] ?? "").trim();
    if (!first || !second) {
        throw new Error('Readme.md must contain "## First cycle" and "## Second cycle" sections.');
    }
    return { first, second };
}
function printAssistant(tag, m) {
    const content = (m.message?.content ?? [])
        .map((c) => (c.type === "text" ? c.text : ""))
        .join("");
    if (content)
        process.stdout.write(`${tag} ${content}\n`);
}
function printPartial(tag, m) {
    const ev = m.event;
    if (ev?.type === "content_block_delta" &&
        ev?.delta?.type === "text_delta" &&
        typeof ev?.delta?.text === "string") {
        process.stdout.write(ev.delta.text);
    }
    else if (ev?.type === "message_stop") {
        process.stdout.write("\n");
    }
}
function withHooks(base) {
    return {
        ...base,
        hooks: {
            PreToolUse: [
                {
                    hooks: [
                        async (input) => {
                            const anyIn = input;
                            const tool = anyIn.tool_name;
                            const tin = anyIn.tool_input;
                            if (tool === "Grep") {
                                console.log(`[tool][Grep] pattern=${tin.pattern} path=${tin.path ?? "."} mode=${tin.output_mode ?? "content"}`);
                            }
                            else if (tool === "Bash") {
                                console.log(`[tool][Bash] $ ${tin.command}`);
                            }
                            else if (tool === "Write") {
                                console.log(`[tool][Write] -> ${tin.file_path} (${String(tin.content ?? "").length} bytes)`);
                            }
                            else if (tool === "Read") {
                                console.log(`[tool][Read] <- ${tin.file_path}`);
                            }
                            else if (tool === "Edit") {
                                console.log(`[tool][Edit] ${tin.file_path}`);
                            }
                            return {};
                        },
                    ],
                },
            ],
            PostToolUse: [
                {
                    hooks: [
                        async (input) => {
                            const anyIn = input;
                            const tool = anyIn.tool_name;
                            const tout = anyIn.tool_response;
                            if (tool === "Bash") {
                                const out = tout?.output ?? "";
                                if (out)
                                    process.stdout.write(out);
                            }
                            else if (tool === "Grep") {
                                console.log(`[tool][Grep][out] ${JSON.stringify(tout)}`);
                            }
                            else if (tool === "Write") {
                                console.log(`[tool][Write][done] ${tout?.file_path} (${tout?.bytes_written} bytes)`);
                            }
                            return {};
                        },
                    ],
                },
            ],
        },
    };
}
async function streamOnce(prompt, options, tag) {
    const q = query({ prompt, options });
    for await (const msg of q) {
        switch (msg.type) {
            case "system": {
                const s = msg;
                console.log(`${tag} [system] tools=${(s.tools || []).join(", ")} model=${s.model} cwd=${s.cwd}`);
                break;
            }
            case "stream_event":
                printPartial(tag, msg);
                break;
            case "assistant":
                printAssistant(tag, msg);
                break;
            case "result": {
                const r = msg;
                console.log(`\n${tag} [result] turns=${r.num_turns} cost=$${(r.total_cost_usd ?? 0).toFixed(4)} ok=${!r.is_error}`);
                break;
            }
            default:
                break;
        }
    }
}
export async function run({ name, url, htmlPath }) {
    const html = htmlPath ?? `./${name}.html`;
    if (!htmlPath && url) {
        await renderFetchToFile(url, html);
        console.log(`[fetch] ${url} -> ${html}`);
    }
    const { first, second } = await extractPrompts();
    const firstMsg = `${first}\n\nThis is the file: ${name}.html`;
    const secondMsg = second;
    const base = {
        cwd: process.cwd(),
        systemPrompt: { type: "preset", preset: "claude_code" },
        includePartialMessages: true,
        permissionMode: "bypassPermissions",
    };
    const opts = withHooks(base);
    await streamOnce(firstMsg, opts, "[T1]");
    await streamOnce(secondMsg, { ...opts, continue: true }, "[T2]");
}
