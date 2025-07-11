import { Octokit } from "octokit";

const GH_TOKEN = process.env.GH_TOKEN;
const REPO_OWNER = process.env.REPO_OWNER;
const REPO_NAME = process.env.REPO_NAME;
const TARGET_BRANCH = process.env.TARGET_BRANCH || "main";

export default async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const { username, api_key, discord_id } = req.body;

  if (!username || !api_key) {
    return res.status(400).json({ error: "Missing username or API key" });
  }

  // Validate API key with RA
  const raRes = await fetch(
    `https://retroachievements.org/API/API_GetUserSummary.php?u=${username}&y=${api_key}`
  );

  if (!raRes.ok) {
    return res.status(401).json({ error: "Invalid RA username or API key" });
  }

  const octokit = new Octokit({ auth: GH_TOKEN });

  // Step 1: Get current file
  const { data: currentFile } = await octokit.repos.getContent({
    owner: REPO_OWNER,
    repo: REPO_NAME,
    path: "data/users.json",
    ref: TARGET_BRANCH,
  });

  const decoded = Buffer.from(currentFile.content, "base64").toString();
  const users = JSON.parse(decoded);

  // Step 2: Add user if not already in list
  if (users.some(u => u.username === username)) {
    return res.json({ message: "You’re already registered!" });
  }

  users.push({
    username,
    api_key,
    discord_id: discord_id || null,
  });

  const updatedContent = Buffer.from(JSON.stringify(users, null, 2)).toString("base64");

  // Step 3: Create new branch
  const branchName = `add-user-${username}-${Date.now()}`;
  const { data: mainRef } = await octokit.git.getRef({
    owner: REPO_OWNER,
    repo: REPO_NAME,
    ref: `heads/${TARGET_BRANCH}`,
  });

  await octokit.git.createRef({
    owner: REPO_OWNER,
    repo: REPO_NAME,
    ref: `refs/heads/${branchName}`,
    sha: mainRef.object.sha,
  });

  // Step 4: Commit change
  await octokit.repos.createOrUpdateFileContents({
    owner: REPO_OWNER,
    repo: REPO_NAME,
    path: "data/users.json",
    message: `Add user: ${username}`,
    content: updatedContent,
    branch: branchName,
    sha: currentFile.sha,
  });

  // Step 5: Open PR
  await octokit.pulls.create({
    owner: REPO_OWNER,
    repo: REPO_NAME,
    title: `Register ${username} for RA notifications`,
    head: branchName,
    base: TARGET_BRANCH,
    body: `This PR registers ${username} for Discord achievement notifications.`,
  });

  return res.json({ message: "✅ Registration submitted! Awaiting admin approval." });
};
