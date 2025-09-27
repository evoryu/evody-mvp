#!/usr/bin/env node
// Contrast checker with CLI threshold + JSON output
// Usage:
//   node scripts/contrast-check.js               (default threshold 3)
//   node scripts/contrast-check.js --min=4.5     (enforce AA for normal text)
//   node scripts/contrast-check.js --json        (machine-readable)
//   node scripts/contrast-check.js --json --min=4.5 > report.json

const light = { backgrounds: { 'c-bg': '#ffffff', 'c-bg-subtle': '#f9fafb', 'c-surface': '#ffffff', 'c-surface-alt': '#f6f6f7' }, texts: { 'c-text': '#111827', 'c-text-secondary': '#4b5563', 'c-text-muted': '#6b7280', 'c-text-disabled': '#7d8693' } }
const dark = { backgrounds: { 'c-bg': '#09090b', 'c-bg-subtle': '#18181b', 'c-surface': '#18181b', 'c-surface-alt': '#27272a' }, texts: { 'c-text': '#fafafa', 'c-text-secondary': '#a1a1aa', 'c-text-muted': '#8a8a92', 'c-text-disabled': '#74747e' } }

function srgbChannel(c){const cs=c/255;return cs<=0.03928?cs/12.92:Math.pow((cs+0.055)/1.055,2.4)}
function hexToRgb(hex){const h=hex.replace('#','');const v=h.length===3?h.split('').map(x=>x+x).join(''):h;const int=parseInt(v,16);return[(int>>16)&255,(int>>8)&255,int&255]}
function relativeLuminance(hex){const [r,g,b]=hexToRgb(hex);const R=srgbChannel(r);const G=srgbChannel(g);const B=srgbChannel(b);return 0.2126*R+0.7152*G+0.0722*B}
function contrast(a,b){const L1=relativeLuminance(a);const L2=relativeLuminance(b);const bright=Math.max(L1,L2);const dark=Math.min(L1,L2);return (bright+0.05)/(dark+0.05)}
function evaluate(r){if(r>=7)return'AAA';if(r>=4.5)return'AA';if(r>=3)return'AA Large';return'Fail'}

function compute(label,group){const results=[];for(const[tName,tHex]of Object.entries(group.texts)){for(const[bName,bHex]of Object.entries(group.backgrounds)){const ratio=contrast(tHex,bHex);results.push({ mode:label, text:tName, background:bName, ratio:+ratio.toFixed(3), level:evaluate(ratio) })}}results.sort((a,b)=>a.ratio-b.ratio);return results}

// CLI parsing
const argv = process.argv.slice(2)
let min = 3
let json = false
for(const arg of argv){
	if(arg.startsWith('--min=')){ const v = parseFloat(arg.split('=')[1]); if(!isNaN(v)) min = v }
	else if(arg==='--json') json = true
	else if(arg==='--help'){ console.log('Options:\n  --min=<number>   Minimum contrast ratio (default 3)\n  --json           Output JSON only\n  --help           Show help'); process.exit(0) }
}

const lightResults = compute('light', light)
const darkResults = compute('dark', dark)
const all = [...lightResults, ...darkResults]

const failures = all.filter(r => r.ratio < min)

if(json){
	console.log(JSON.stringify({ min, failures, results: all }, null, 2))
} else {
	console.log(`Min threshold: ${min}`)
	function printSection(label, list){
		console.log(`\n=== ${label.toUpperCase()} MODE ===`)
		list.filter(r=>r.mode===label).forEach(r=>{
			const flag = r.ratio < min ? ' ❌' : ''
			console.log(`${r.text} on ${r.background}: ${r.ratio.toFixed(2)} (${r.level})${flag}`)
		})
	}
	printSection('light', lightResults)
	printSection('dark', darkResults)
	if(failures.length){
		console.log(`\nFAILURES (${failures.length}) below ${min}:`)
		failures.forEach(f=>console.log(` - ${f.mode} ${f.text} on ${f.background}: ${f.ratio}`))
	} else {
		console.log('\nAll pairs meet threshold.')
	}
}

if(failures.length) process.exit(1)