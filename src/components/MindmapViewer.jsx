import React, { useState, useRef, useCallback } from "react";
import "./MindmapViewer.css";

// ─── Parser ────────────────────────────────────────────────────────────────
function parseLabel(raw) {
    // Strip Mermaid root keyword prefix
    const stripped = raw.replace(/^root\s*/i, "").trim();
    // Strip mermaid shape decorators: ((text)), (text), [text], >text], etc.
    return stripped
        .replace(/^\(\((.+?)\)\)$/, "$1")
        .replace(/^\((.+?)\)$/, "$1")
        .replace(/^\[(.+?)\]$/, "$1")
        .replace(/^>(.+?)\]$/, "$1")
        .replace(/^\{(.+?)\}$/, "$1")
        .replace(/^{{(.+?)}}$/, "$1")
        .replace(/^"(.+?)"$/, "$1")
        .trim();
}

function parseMindmap(code) {
    const lines = code
        .replace(/```mermaid\n?/gi, "")
        .replace(/```/g, "")
        .split(/\n/)
        .filter((l) => l.trim() && !l.trim().toLowerCase().startsWith("mindmap"));

    const root = { label: "Root", children: [], depth: -1 };
    const stack = [root];

    for (const line of lines) {
        const indent = line.match(/^(\s*)/)[1].length;
        const raw = line.trim();
        if (!raw) continue;

        const node = { label: parseLabel(raw), children: [], depth: indent };

        // pop stack until we find a parent with smaller indent
        while (stack.length > 1 && stack[stack.length - 1].depth >= indent) {
            stack.pop();
        }
        stack[stack.length - 1].children.push(node);
        stack.push(node);
    }

    return root.children.length === 1 ? root.children[0] : { label: "Root", children: root.children, depth: 0 };
}

// ─── Node Component ─────────────────────────────────────────────────────────
const COLORS = [
    { bg: "rgba(99,60,155,0.85)", border: "rgba(160,120,220,0.7)" },
    { bg: "rgba(30,100,170,0.85)", border: "rgba(80,160,230,0.7)" },
    { bg: "rgba(20,130,100,0.85)", border: "rgba(60,190,150,0.7)" },
    { bg: "rgba(160,60,30,0.85)", border: "rgba(220,120,80,0.7)" },
    { bg: "rgba(120,100,20,0.85)", border: "rgba(200,180,60,0.7)" },
];

function MindmapNode({ node, depth, colorIdx }) {
    const color = COLORS[colorIdx % COLORS.length];
    const isRoot = depth === 0;

    return (
        <div className={`mm-node-wrap ${isRoot ? "mm-root-wrap" : ""}`}>
            {/* The label box */}
            <div
                className={`mm-node ${isRoot ? "mm-root" : ""}`}
                style={isRoot ? {} : { background: color.bg, borderColor: color.border }}
            >
                {node.label}
            </div>

            {/* Children */}
            {node.children.length > 0 && (
                <div className="mm-children">
                    {node.children.map((child, i) => (
                        <MindmapNode
                            key={i}
                            node={child}
                            depth={depth + 1}
                            colorIdx={isRoot ? i : colorIdx}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── Main Component ─────────────────────────────────────────────────────────
export default function MindmapViewer({ code }) {
    const [scale, setScale] = useState(1);
    const [translate, setTranslate] = useState({ x: 0, y: 0 });
    const isPanning = useRef(false);
    const lastMouse = useRef({ x: 0, y: 0 });

    const onWheel = useCallback((e) => {
        e.preventDefault();
        const factor = e.deltaY < 0 ? 1.08 : 0.93;
        setScale((s) => Math.max(0.2, Math.min(5, s * factor)));
    }, []);

    const onMouseDown = useCallback((e) => {
        if (e.button !== 0) return;
        isPanning.current = true;
        lastMouse.current = { x: e.clientX, y: e.clientY };
    }, []);

    const onMouseMove = useCallback((e) => {
        if (!isPanning.current) return;
        const dx = e.clientX - lastMouse.current.x;
        const dy = e.clientY - lastMouse.current.y;
        lastMouse.current = { x: e.clientX, y: e.clientY };
        setTranslate((t) => ({ x: t.x + dx, y: t.y + dy }));
    }, []);

    const onMouseUp = useCallback(() => { isPanning.current = false; }, []);

    if (!code || !code.trim()) return null;

    let tree;
    try {
        tree = parseMindmap(code);
    } catch {
        return <div className="mindmap-error">⚠ Không thể phân tích cú pháp sơ đồ.</div>;
    }

    return (
        <div className="mindmap-viewer">
            {/* Toolbar */}
            <div className="mindmap-controls">
                <button onClick={() => setScale((s) => Math.min(5, s * 1.2))} title="Phóng to">+</button>
                <span>{Math.round(scale * 100)}%</span>
                <button onClick={() => setScale((s) => Math.max(0.2, s * 0.83))} title="Thu nhỏ">−</button>
                <button onClick={() => { setScale(1); setTranslate({ x: 0, y: 0 }); }} title="Reset">⟳</button>
            </div>

            {/* Stage */}
            <div
                className="mindmap-stage"
                onWheel={onWheel}
                onMouseDown={onMouseDown}
                onMouseMove={onMouseMove}
                onMouseUp={onMouseUp}
                onMouseLeave={onMouseUp}
            >
                <div
                    style={{
                        transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
                        transformOrigin: "top center",
                        width: "100%",
                    }}
                >
                    <MindmapNode node={tree} depth={0} colorIdx={0} />
                </div>
            </div>
        </div>
    );
}
