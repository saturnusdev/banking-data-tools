export type JsonType =
    | 'object'
    | 'array'
    | 'string'
    | 'number'
    | 'boolean'
    | 'null';

export interface TreeNode {
    id: string;
    key: string;
    path: string;
    type: JsonType;
    value: any;
    children?: TreeNode[];
}

function getType(value: any): JsonType {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    return typeof value as JsonType;
}

export function buildTree(
    value: any,
    path = '$'
): TreeNode[] {
    if (typeof value !== 'object' || value === null) return [];

    return Object.entries(value).map(([key, val]) => {
        const currentPath = `${path}.${key}`;
        const type = getType(val);

        return {
            id: currentPath,
            key,
            path: currentPath,
            type,
            value: val,
            children:
                type === 'object' || type === 'array'
                    ? buildTree(val, currentPath)
                    : undefined
        };
    });
}

export function collectNodeIds(nodes: TreeNode[]): string[] {
  const ids: string[] = [];

  function walk(node: TreeNode) {
    ids.push(node.id);
    node.children?.forEach(walk);
  }

  nodes.forEach(walk);
  return ids;
}