const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const Hashids = require("hashids/cjs");

const hashid = new Hashids("changemelater123", 16);

function createId() {
    let currentIdFile = "./data/current_id.json";
    let currentId = 0;
    if (fs.existsSync(currentIdFile)) {
        var data = JSON.parse(fs.readFileSync(currentIdFile));
        currentId = data.currentId;
    }
    fs.writeFileSync(currentIdFile, JSON.stringify({ currentId: currentId + 1 }));
    return hashid.encode(currentId);
}

let releases = [];

createRelease("android", releases);
createRelease("ios", releases);

for (let release of releases) {
    console.log(release);
}

function createRelease(name, releases) {
    var assetPath = "./" + name;
    var checksumPath = "./data/" + name + "_checksum.json";

    console.log("Scanning asset for " + name);

    let lastChecksum;

    if (fs.existsSync(checksumPath)) {
        lastChecksum = JSON.parse(fs.readFileSync(checksumPath));
    } else {
        lastChecksum = {};
    }

    let res = {}

    let files = fs.readdirSync(assetPath);

    let release = [];

    let changesMade = false;

    let dependenciesFile = path.join(assetPath, "dependencies.txt");
    let dependenciesData = fs.readFileSync(dependenciesFile);
    let currentHeader = null;
    let dependencies = {}
    for (let line of dependenciesData.toString().split("\r\n")) {
        if (line.length == 0) continue;
        console.log(line);
        if (line.startsWith("  ")) {
            dependencies[currentHeader].push(line.substring(2));
        } else {
            currentHeader = hash(line);
            dependencies[currentHeader] = [];
        }
    }

    for (let file of files) {
        if (file == "dependencies.txt") continue;
        let filePath = path.join(assetPath, file);

        let data = fs.readFileSync(filePath);
        let checksum = generateChecksum(data);

        let info = {
            name: hash(file),
            checksum: checksum
        };

        res[info.name] = info;

        var oldData = lastChecksum[info.name];
        if (oldData != null) {
            if (oldData.checksum != checksum) {
                console.log("file modify -> " + file);

                info.hash = createContentFile(data);
                changesMade = true;
            } else {
                console.log("file is same -> " + file);
                info.hash = oldData.hash;
            }
        } else {
            console.log("new file added -> " + file + " (" + checksum + ")")

            info.hash = createContentFile(data);
            changesMade = true;
        }

        release.push({ id: info.name, hash: info.hash, dep: dependencies[file] });
    }

    if (!changesMade && Object.entries(lastChecksum).length != Object.entries(res).length) {
        console.log("files were deleted");
        changesMade = true;
    }

    var lastReleaseFile = "./data/latest_" + name + ".txt";

    let releaseFile;
    if (changesMade) {
        fs.writeFileSync(checksumPath, JSON.stringify(res));

        releaseFile = createId() + ".json";
        fs.writeFileSync("../public/" + releaseFile, JSON.stringify({ assets: release }));
        fs.writeFileSync(lastReleaseFile, releaseFile);

        console.log("Release done -> " + releaseFile);
    } else {
        console.log("No changes were made... no release");

        if (fs.existsSync(lastReleaseFile)) {
            releaseFile = fs.readFileSync(lastReleaseFile).toString();
        }
    }

    if (release != null)
        releases.push({ name: name, release: releaseFile });
}

function hash(name) {
    return name;
    //return md5(name);
}

function createContentFile(data) {
    var hash = createId();

    fs.writeFileSync("../public/" + hash, data);

    return hash;
}

function md5(data) {
    return crypto.createHash("md5")
        .update(data, "utf8")
        .digest("hex");
}

function generateChecksum(data) {
    return md5(data);
}