// /site/api/register.js
import { Octokit } from "octokit";

export default async (req, res) => {
  if (req.method !== "POST") return res.status(405).send("POST only");

  const { username, apiKey, discordId } = req.body;

  /* 1. sanity‑check RA key */
  const ok = await fetch(
    `https://retroachievements.org/API/API_GetUserSummary.php?u=${username}&y=${apiKey}`
  ).then(r => r.ok);
  if (!ok) return res.status(400).json({ error: "Bad RA creds" });

  /* 2. open a PR appending the new user to data/users.json */
  const octokit = new Octokit({ auth: process.env.GH_TOKEN });

  const { data: repo } = await octokit.rest.repos.get({
    owner: process.env.REPO_OWNER,
    repo: process.env.REPO_NAME,
  });

  // fetch, edit, commit on a branch, open PR … (boilerplate omitted)
  // see https://docs.github.com/en/rest for exact calls
  return res.json({ status: "queued" });
};
