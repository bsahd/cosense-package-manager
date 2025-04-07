#!/usr/bin/env node
import * as parser from "@progfay/scrapbox-parser";
import * as fs from "fs/promises";
import path from "path";
const apiBase = "https://scrapbox.io/api/pages/";

function sanitizeFileName(name) {
	// Windowsで使えない文字を考慮
	if (process.platform === "win32") {
		return name
			.replaceAll("%", "%25")
			.replaceAll(":", "%3A")
			.replaceAll("*", "%2A")
			.replaceAll("?", "%3F")
			.replaceAll('"', "%22")
			.replaceAll("<", "%3C")
			.replaceAll(">", "%3E")
			.replaceAll("?", "%3F")
			.replaceAll("|", "%7C")
			.replaceAll("/", "%2F");
	} else {
		return name.replaceAll("%", "%25").replaceAll("/", "%2F");
	}
}

async function main(projectName, entryPoint) {
	try {
		await fs.mkdir(path.join(".", "cosense_modules"));
	} catch {}
	const fetchedPages = [];
	const queuePages = [entryPoint.replaceAll(" ", "_").toLowerCase()];
	while (true) {
		const pageName = queuePages.shift();
		if (typeof pageName == "undefined") {
			break;
		}
		fetchedPages.push(pageName);
		console.clear();
		console.log(pageName);
		console.log(queuePages.length + " pages left");
		for (const element of queuePages.slice(0, 8)) {
			console.log(element);
		}
		const pres = await fetch(apiBase + projectName + "/" + encodeURIComponent(pageName));
		const page = await pres.json();
		try {
			await fs.mkdir(path.join(".", "cosense_modules", sanitizeFileName(pageName)));
		} catch {}
		await fs.writeFile(
			path.join(".", "cosense_modules", sanitizeFileName(pageName), "page.json"),
			JSON.stringify(page),
		);
		const pagetext = page.lines.map((a) => a.text).join("\n");
		await fs.writeFile(
			path.join(".", "cosense_modules", sanitizeFileName(pageName), "page.txt"),
			pagetext,
		);
		const pageparse = parser.parse(pagetext);
		let codeBlockCount = 0;
		for (const element of pageparse) {
			if (element.type == "codeBlock") {
				codeBlockCount++;
				try {
					await fs.writeFile(
						path.join(
							".",
							"cosense_modules",
							sanitizeFileName(pageName),
							sanitizeFileName(element.fileName),
						),
						element.content,
					);
				} catch (e) {
					console.error(e);
				}
			}
		}
		if (codeBlockCount > 0) {
			for (const element of page.relatedPages.links1hop) {
				if (
					!queuePages.includes(element.titleLc) &&
					!fetchedPages.includes(element.titleLc)
				) {
					queuePages.push(element.titleLc);
				}
			}
		}
	}
}
main(...process.argv.slice(2));
