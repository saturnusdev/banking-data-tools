/* ------------------------------------------------------------------ */
/*  tree.ts - XML structural tree builder (element/attr/text/cdata)    */
/* ------------------------------------------------------------------ */

export type XmlNodeType =
	| 'element'
	| 'attribute'
	| 'text'
	| 'comment'
	| 'cdata'
	| 'declaration'
	| 'pi';

export interface XmlTreeNode {
	id: string;
	key: string;
	path: string;
	type: XmlNodeType;
	value: string;
	children?: XmlTreeNode[];
}

interface OpenTag {
	name: string;
	attributes: { name: string; value: string }[];
	selfClosing: boolean;
}

/** Find the closing `>` of a tag, ignoring `>` inside quoted attribute values. */
function findTagEnd(xml: string, start: number): number {
	let inSingle = false;
	let inDouble = false;
	for (let i = start; i < xml.length; i++) {
		const c = xml[i];
		if (c === '"' && !inSingle) inDouble = !inDouble;
		else if (c === "'" && !inDouble) inSingle = !inSingle;
		else if (c === '>' && !inSingle && !inDouble) return i;
	}
	return -1;
}

export function decodeEntities(s: string): string {
	const code = (n: number) =>
		Number.isFinite(n) && n >= 0 && n <= 0x10ffff ? String.fromCodePoint(n) : '';
	return s
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&apos;/g, "'")
		.replace(/&amp;/g, '&')
		.replace(/&#x([0-9a-fA-F]+);/g, (_, n) => code(parseInt(n, 16)))
		.replace(/&#(\d+);/g, (_, n) => code(Number(n)));
}

function parseOpenTag(raw: string): OpenTag {
	const selfClosing = /\/\s*$/.test(raw);
	const body = selfClosing ? raw.replace(/\/\s*$/, '') : raw;
	const nameMatch = body.match(/^[^\s=\/>]+/);
	const name = nameMatch ? nameMatch[0] : '';
	const rest = body.slice(name.length);
	const attributes: { name: string; value: string }[] = [];
	const attrRe = /([^\s=]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
	let m: RegExpExecArray | null;
	while ((m = attrRe.exec(rest))) {
		attributes.push({ name: m[1], value: decodeEntities(m[2] ?? m[3] ?? '') });
	}
	return { name, attributes, selfClosing };
}

function makeLeaf(type: XmlNodeType, key: string, value: string): XmlTreeNode {
	return { id: '', key, path: '', type, value };
}

function makeElement(name: string, attributes: { name: string; value: string }[]): XmlTreeNode {
	const children: XmlTreeNode[] = attributes.map((a) => makeLeaf('attribute', '@' + a.name, a.value));
	return { id: '', key: name, path: '', type: 'element', value: '', children };
}
/**
 * Parse XML into a tree of element / attribute / text / comment / CDATA /
 * declaration nodes. Pure string parsing (no DOM), so it is SSR-safe.
 * Throws an Error on malformed XML (unbalanced tags, unterminated sections).
 */
export function buildXmlTree(xml: string): XmlTreeNode[] {
	const roots: XmlTreeNode[] = [];
	const stack: XmlTreeNode[] = [];

	const add = (node: XmlTreeNode) => {
		const parent = stack.length ? stack[stack.length - 1] : null;
		let base: string;
		if (parent) {
			const siblings = parent.children ?? (parent.children = []);
			let n = 0;
			for (const s of siblings) if (s.key === node.key && s.type === node.type) n++;
			base = parent.path + '/' + node.key + (node.type === 'attribute' ? '' : `[${n}]`);
			siblings.push(node);
		} else {
			const n = roots.filter((r) => r.key === node.key && r.type === node.type).length;
			base = '/' + node.key + (node.type === 'attribute' ? '' : `[${n}]`);
			roots.push(node);
		}
		node.id = base;
		node.path = base;
		// Attribute children belong inline to their element (already created).
		if (node.type === 'element' && node.children) {
			for (const c of node.children) {
				if (c.type === 'attribute') {
					c.id = base + '/' + c.key;
					c.path = c.id;
				}
			}
		}
	};

	// Collapse pure text/CDATA leaf content into the element's `value` so leaves
	// render compactly (e.g. `<id>001</id>`), while keeping structural children.
	const finalize = (node: XmlTreeNode) => {
		const kids = node.children ?? [];
		const hasStructure = kids.some(
			(c) =>
				c.type === 'element' ||
				c.type === 'comment' ||
				c.type === 'pi' ||
				c.type === 'declaration'
		);
		if (!hasStructure) {
			const textParts = kids
				.filter((c) => c.type === 'text' || c.type === 'cdata')
				.map((c) => c.value);
			if (textParts.length) node.value = textParts.join('');
			node.children = kids.filter((c) => c.type === 'attribute');
		}
	};

	let pos = 0;
	while (pos < xml.length) {
		const lt = xml.indexOf('<', pos);
		if (lt === -1) {
			const text = xml.slice(pos).trim();
			if (text) add(makeLeaf('text', '#text', decodeEntities(text)));
			break;
		}
		if (lt > pos) {
			const text = xml.slice(pos, lt).trim();
			if (text) add(makeLeaf('text', '#text', decodeEntities(text)));
		}
		if (xml.startsWith('<!--', lt)) {
			const end = xml.indexOf('-->', lt + 4);
			if (end === -1) throw new Error('Unterminated comment');
			add(makeLeaf('comment', 'comment', xml.slice(lt + 4, end)));
			pos = end + 3;
		} else if (xml.startsWith('<![CDATA[', lt)) {
			const end = xml.indexOf(']]>', lt + 9);
			if (end === -1) throw new Error('Unterminated CDATA section');
			add(makeLeaf('cdata', 'cdata', xml.slice(lt + 9, end)));
			pos = end + 3;
		} else if (xml.startsWith('<?', lt)) {
			const end = xml.indexOf('?>', lt + 2);
			if (end === -1) throw new Error('Unterminated processing instruction');
			const content = xml.slice(lt + 2, end).trim();
			const name = content.split(/\s/)[0] || '';
			add(makeLeaf(name === 'xml' ? 'declaration' : 'pi', '<?' + name + '?>', content));
			pos = end + 2;
		} else if (xml.startsWith('<!', lt)) {
			const end = findTagEnd(xml, lt + 2);
			if (end === -1) throw new Error('Unterminated declaration');
			add(makeLeaf('pi', '<!DOCTYPE>', xml.slice(lt + 2, end).trim()));
			pos = end + 1;
		} else {
			const end = findTagEnd(xml, lt + 1);
			if (end === -1) throw new Error('Unterminated tag');
			const raw = xml.slice(lt + 1, end).trim();
			pos = end + 1;
			if (raw.startsWith('/')) {
				const name = raw.slice(1).trim().split(/\s/)[0];
				const top = stack[stack.length - 1];
				if (!top || top.key !== name) {
					throw new Error(`Unexpected closing tag </${name}>`);
				}
				stack.pop();
				finalize(top);
			} else {
				const { name, attributes, selfClosing } = parseOpenTag(raw);
				if (!name) throw new Error('Malformed tag');
				const node = makeElement(name, attributes);
				add(node);
				if (selfClosing) {
					finalize(node);
				} else {
					stack.push(node);
				}
			}
		}
	}
	if (stack.length) throw new Error(`Unclosed tag <${stack[stack.length - 1].key}>`);
	return roots;
}

export function collectXmlNodeIds(nodes: XmlTreeNode[]): string[] {
	const ids: string[] = [];
	const walk = (node: XmlTreeNode) => {
		ids.push(node.id);
		node.children?.forEach(walk);
	};
	nodes.forEach(walk);
	return ids;
}

