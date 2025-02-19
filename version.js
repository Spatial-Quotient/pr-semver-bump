const github = require('@actions/github')
const semver = require('semver')
const childProcess = require('child_process')
const fs = require('fs')

// Tags the specified version and annotates it with the provided release notes.
async function createRelease(version, releaseNotes, config) {
    const tag = `${config.v}${version}`

    if (!config.useSSH) {
        const tagCreateResponse = await config.octokit.git.createTag({
            ...github.context.repo,
            tag: tag,
            message: releaseNotes,
            object: process.env.GITHUB_SHA,
            type: 'commit',
        })

        await config.octokit.git.createRef({
            ...github.context.repo,
            ref: `refs/tags/${tag}`,
            sha: tagCreateResponse.data.sha,
        })
    } else {
        const releaseNotesFile = './.relase-notes.txt'
        fs.writeFileSync(releaseNotesFile, releaseNotes)
        // The git checkout is already on the correct commit, simply
        // add a tag to add the /refs/tags/...
        childProcess.execSync(`git tag -F ${releaseNotesFile} ${tag}`)
        childProcess.execSync('git push --tags')
    }

    return tag
}

// Returns the most recent tagged version in git.
async function getCurrentVersion(config) {
    const data = await config.octokit.git.listMatchingRefs({
        ...github.context.repo,
        namespace: 'tags/',
    })

    const versions = data.data
        .map((ref) => semver.parse(ref.ref.replace(/^refs\/tags\//g, ''), { loose: true }))
        .filter((version) => version !== null)
        .sort(semver.rcompare)

    if (versions[0] !== undefined) {
        return `${versions[0]}`
    }

    return '0.0.0'
}

exports.createRelease = createRelease
exports.getCurrentVersion = getCurrentVersion
