export const OWNER = "Jsy1to4winter";
export const REPO = "open-archive-portfolio";
const ROOT = `https://api.github.com/repos/${OWNER}/${REPO}`;
export type Upload = { path: string; base64: string };
export async function github<T>(
  token: string,
  url: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!response.ok) {
    if (response.status === 401)
      throw new Error("凭证无效或已过期，请重新登录。");
    if (response.status === 403 || response.status === 404)
      throw new Error(
        "没有此仓库的编辑权限。请检查凭证是否选择了此仓库，以及 Contents 读写权限。",
      );
    if (response.status === 409 || response.status === 422)
      throw new Error(
        "仓库已发生更新。请备份草稿并重新登录，加载最新内容后再发布。",
      );
    throw new Error(`GitHub 请求失败（${response.status}），请稍后重试。`);
  }
  return response.json() as Promise<T>;
}
export async function login(token: string) {
  const user = await github<{ login: string }>(
    token,
    "https://api.github.com/user",
  );
  if (user.login.toLowerCase() !== OWNER.toLowerCase())
    throw new Error("只有网站所有者的 GitHub 账号可以编辑。");
  const repo = await github<{
    default_branch: string;
    permissions?: { push?: boolean };
  }>(token, ROOT);
  if (!repo.permissions?.push) throw new Error("当前账号没有仓库写入权限。");
  const branch = repo.default_branch;
  const ref = await github<{ object: { sha: string } }>(
    token,
    `${ROOT}/git/ref/heads/${encodeURIComponent(branch)}`,
  );
  const commit = await github<{ tree: { sha: string } }>(
    token,
    `${ROOT}/git/commits/${ref.object.sha}`,
  );
  let content: unknown = null;
  const tree = await github<{ tree: Array<{ path: string; sha: string }> }>(
    token,
    `${ROOT}/git/trees/${commit.tree.sha}?recursive=1`,
  );
  const file = tree.tree.find((item) => item.path === "public/content.json");
  if (file) {
    const blob = await github<{ content: string }>(
      token,
      `${ROOT}/git/blobs/${file.sha}`,
    );
    content = JSON.parse(
      new TextDecoder().decode(
        Uint8Array.from(atob(blob.content.replace(/\s/g, "")), (c) =>
          c.charCodeAt(0),
        ),
      ),
    );
  }
  return { branch, head: ref.object.sha, tree: commit.tree.sha, content };
}
export async function publish(
  token: string,
  base: Awaited<ReturnType<typeof login>>,
  content: unknown,
  uploads: Upload[],
) {
  const latest = await github<{ object: { sha: string } }>(
    token,
    `${ROOT}/git/ref/heads/${encodeURIComponent(base.branch)}`,
  );
  if (latest.object.sha !== base.head)
    throw new Error("仓库已发生更新。请备份草稿并重新登录，避免覆盖新内容。");
  const entries: Array<{
    path: string;
    mode: string;
    type: string;
    sha: string;
  }> = [];
  const files = [
    ...uploads,
    {
      path: "public/content.json",
      base64: encodeBase64(
        new TextEncoder().encode(JSON.stringify(content, null, 2) + "\n"),
      ),
    },
  ];
  for (const file of files) {
    const blob = await github<{ sha: string }>(
      token,
      `${ROOT}/git/blobs`,
      "POST",
      { content: file.base64, encoding: "base64" },
    );
    entries.push({
      path: file.path,
      mode: "100644",
      type: "blob",
      sha: blob.sha,
    });
  }
  const tree = await github<{ sha: string }>(
    token,
    `${ROOT}/git/trees`,
    "POST",
    { base_tree: base.tree, tree: entries },
  );
  const commit = await github<{ sha: string }>(
    token,
    `${ROOT}/git/commits`,
    "POST",
    {
      message: "Update portfolio content from site editor",
      tree: tree.sha,
      parents: [base.head],
    },
  );
  await github(
    token,
    `${ROOT}/git/refs/heads/${encodeURIComponent(base.branch)}`,
    "PATCH",
    { sha: commit.sha, force: false },
  );
  return { ...base, head: commit.sha, tree: tree.sha };
}
export function encodeBase64(bytes: Uint8Array) {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 8192)
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(binary);
}
