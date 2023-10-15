/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-var-requires */

import * as xml2js from "xml2js";
import * as fs from "fs";
import * as path from "path";
import * as tmp from "tmp";
import * as unzipper from "unzipper";
import { walkUntil } from "./utils/myPath";
import { htmlToMarkdown } from "obsidian";

export class Chapter {
	name: string;
	url: string;
	subItems: Chapter[];

	constructor(
		name: string,
		url: string,
		subItems: Chapter[] = new Array<Chapter>()
	) {
		this.name = name;
		this.url = url;
		this.subItems = subItems;
	}

	getHtml(): string {
		const chapter = fs.readFileSync(this.url.split("#")[0], "utf-8");
		return chapter;
	}

	getMarkdown():string{
		return htmlToMarkdown(this.getHtml());
	}

	getFileName(): string {
		return path.basename(this.url).split("#")[0];
	}
}

export class EpubParser {
	epubPath: string;
	tmpobj: any;
	tocFile: string;
	toc: Chapter[];
	opfFile: string;
	coverPath: string;

	constructor(path: string) {
		this.epubPath = path;
	}

	async init() {
		this.tmpobj = tmp.dirSync({ unsafeCleanup: true });
		await fs
			.createReadStream(this.epubPath)
			.pipe(unzipper.Extract({ path: this.tmpobj.name }))
			.promise();
	}

	findTocFile() {
		console.log("this.tmpobj.name: ", this.tmpobj.name);
		this.tocFile = walkUntil(
			this.tmpobj.name,
			"file",
			(filePath: string) => 	path.basename(filePath) == "toc.ncx"
		);
		console.log("toc file path: ", this.tocFile);
	}

	findOpfFile() {
		
		this.opfFile = walkUntil(
			this.tmpobj.name,
			"file",
			(filePath: string) => filePath.includes("content.opf")
		);
		console.log("opf file path: ", this.opfFile);
	}

	async parseToc() {
		const parser = new xml2js.Parser();
		const data = fs.readFileSync(this.tocFile, "utf-8");

		let result: any;
		await parser.parseStringPromise(data).then((result2: any) => {
			result = result2;
		});
		console.log(result);
		const navPoints = result.ncx.navMap[0].navPoint;

		const parseNavPoint = (navPoint: any) => {
			const tocParentPath = path.dirname(this.tocFile);

			const item = new Chapter(
				navPoint.navLabel[0].text[0],
				tocParentPath + "/" + navPoint.content[0].$["src"]
			);

			const subNavPoints = navPoint["navPoint"];
			if (subNavPoints) {
				for (let i = 0; i < subNavPoints.length; i++) {
					const child = subNavPoints[i];
					item.subItems.push(parseNavPoint(child));
				}
			}
			return item;
		};
		const toc = [];
		for (let i = 0; i < navPoints.length; i++) {
			const item = navPoints[i];
			toc.push(parseNavPoint(item));
		}
		this.toc = toc;
		console.log(toc);
	}

	async parseCover() {
		const parser = new xml2js.Parser();
		const data = fs.readFileSync(this.opfFile, "utf-8");

		let result: any;
		await parser.parseStringPromise(data).then((result2: any) => {
			result = result2;
		});
		console.log(result);

		for (let i = 0; i < result.package.manifest[0].item.length; i++) {
			const item = result.package.manifest[0].item[i];
			if (item.$.id.indexOf("cover") !== -1) {
				const opfParentPath = path.dirname(this.opfFile);
				this.coverPath = opfParentPath + "/" + item.$.href;
				break;
			}
		}

		console.log(this.coverPath);
	}

	static async getParser(path: string) {
		const parser = new EpubParser(path);
		await parser.init();
		parser.findTocFile();
		await parser.parseToc();
		parser.findOpfFile();
		await parser.parseCover();
		return parser;
	}
}