let client;

const opts = {
    particleColor: "rgb(200,200,200)",
    lineColor: "rgb(200,200,200)",
    particleAmount: 30,
    defaultSpeed: 1,
    variantSpeed: 1,
    defaultRadius: 2,
    variantRadius: 2,
    linkRadius: 200,
};

const canvasBody = document.getElementById("canvas"), drawArea = canvasBody.getContext("2d");
let delay = 200, tid, rgb = opts.lineColor.match(/\d+/g);

if (window.location.hash) {
    document.getElementById('down').style.display = 'none'
    document.getElementById('down-alt').style.display = 'inline-block'
}

function copyLink(btn) {
    navigator.clipboard.writeText(btn.previousElementSibling.innerText)
    btn.classList.add('copied')
    setTimeout(() => { btn.classList.remove('copied') }, 1100)
}

function init() {
    // Create a WebTorrent client
    client = new WebTorrent()
    // Log when a warning or error occurs
    client.on('warning', logError)
    client.on('error', logError)

    // Share files via upload input element
    const upload = document.querySelector('#upload')
    uploadElement(upload, (err, results) => {
        if (err) {
            logError(err)
            return
        }
        const files = results.map(result => result.file)
        seedFiles(files)
    })
}

function check() {
    var autoDownload = window.location.hash.substr(1) ? true : false
    if (autoDownload) {
        downloadTorrent(window.location.hash.substr(1))
    }
}

function downloadTorrent(infohash) {
    document.getElementById("down").style.display = "none";
    const announce = createTorrent.announceList
    client.add(infohash, { announce }, addTorrent)
    log(`<p id="downloading">Downloading ...</p>`)
}

function seedFiles(files) {
    // Ignore any drag-and-drop that is not a file (i.e. text)
    if (files.length === 0) return
    document.getElementById('note').style.visibility = 'visible'
    client.seed(files, addTorrent)
    //log(`Seeding new torrent with ${files.length} files!`)
}

function addTorrent(torrent) {
    torrent.on('warning', logError)
    torrent.on('error', logError)

    const speed = document.querySelector('#speed')
    speed.style.display = "block"
    // Show the speed stats immediately
    updateSpeed(torrent)
    // Update the speed stats once per second
    const interval = setInterval(() => {
        updateSpeed(torrent)
    }, 1000)
    // When the torrent is done, update the stats one last time, then stop calling updateSpeed()
    torrent.on('done', () => {
        updateSpeed(torrent)
        clearInterval(interval)
        document.getElementById('downloading').remove();
    })
    const torrentIds = torrent.magnetURI.split('&')
    const torId = torrentIds[0].split(':')
    const hash = torId[3]
    let torrentLog = `<div class="torrent-log">
              <p class="link-label">Share link</p>
              <div class="link-and-copy">
                  <p class="link" style="text-transform:lowercase;">https://${window.location.host}/#${hash}</p>
                  <span class="copy" onclick="copyLink(this)">Copy</span>
              </div>
              <p class="files-label">Files <span class="number-of-files">${torrent.files.length}</span></p>
              <div class="file-list">
              </div>
          </div>`
    log(torrentLog)
    let fileList = ``
    torrent.files.forEach(file => {
        // Add a download link
        file.getBlobURL((err, url) => {
            if (err) {
                // If there was an error, add it to the log section
                logError(err)
                return
            }
            // Create a link element
            const a = document.createElement('a')
            a.href = url
            a.textContent = file.name + ` (${prettierBytes(file.length)})`
            // Download the file with given name when clicked
            a.download = file.name
            // Add the link to the log section
            let link = `<a href="${url}" download="${file.name}" onclick="this.classList.add('visited')">${file.name} <span class="file-size">${prettierBytes(file.length)}</span></a>`
            document.getElementsByClassName('file-list')[0].insertAdjacentHTML('beforeEnd', link)

        })
    })
}

function updateSpeed(torrent) {
    const progress = (100 * torrent.progress).toFixed(0)
    const speed = `
          <div class="transfer-info">
              ${window.location.hash ? `<div class="progress"><div id="progressbar" style="width:${progress}%"></div>${progress}%</div>` : ``}
              <div class="live-stats">
                  <div><span class="label">Peers:</span> ${torrent.numPeers}</div>
                  <div><span class="label">Download speed:</span> ${prettierBytes(client.downloadSpeed)}/s</div>
                  <div><span class="label">Upload speed:</span> ${prettierBytes(client.uploadSpeed)}/s</div>             
              </div>                
          </div>
      `
    const speedInfo = document.querySelector('#speed')
    speedInfo.innerHTML = speed
}

// Log a string message
function log(element) {
    const log = document.querySelector('#log')
    log.insertAdjacentHTML('afterBegin', element)
}
// Log an error object
function logError(err) {
    console.log(err.message);
}
//background animation

let resizeReset = function () {
    w = canvasBody.width = window.innerWidth;
    h = canvasBody.height = window.innerHeight;
}

let deBouncer = function () {
    clearTimeout(tid);
    tid = setTimeout(function () {
        resizeReset();
    }, delay);
};

let checkDistance = function (x1, y1, x2, y2) {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
};

let linkPoints = function (point1, hubs) {
    for (let i = 0; i < hubs.length; i++) {
        let distance = checkDistance(point1.x, point1.y, hubs[i].x, hubs[i].y);
        let opacity = 1 - distance / opts.linkRadius;
        if (opacity > 0) {
            drawArea.lineWidth = 0.5;
            drawArea.strokeStyle = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${opacity})`;
            drawArea.beginPath();
            drawArea.moveTo(point1.x, point1.y);
            drawArea.lineTo(hubs[i].x, hubs[i].y);
            drawArea.closePath();
            drawArea.stroke();
        }
    }
}

Particle = function (xPos, yPos) {
    this.x = Math.random() * w;
    this.y = Math.random() * h;
    this.speed = opts.defaultSpeed + Math.random() * opts.variantSpeed;
    this.directionAngle = Math.floor(Math.random() * 360);
    this.color = opts.particleColor;
    this.radius = opts.defaultRadius + Math.random() * opts.variantRadius;
    this.vector = {
        x: Math.cos(this.directionAngle) * this.speed,
        y: Math.sin(this.directionAngle) * this.speed
    };
    this.update = function () {
        this.border();
        this.x += this.vector.x;
        this.y += this.vector.y;
    };
    this.border = function () {
        if (this.x >= w || this.x <= 0) {
            this.vector.x *= -1;
        }
        if (this.y >= h || this.y <= 0) {
            this.vector.y *= -1;
        }
        if (this.x > w) this.x = w;
        if (this.y > h) this.y = h;
        if (this.x < 0) this.x = 0;
        if (this.y < 0) this.y = 0;
    };
    this.draw = function () {
        drawArea.beginPath();
        drawArea.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        drawArea.closePath();
        drawArea.fillStyle = this.color;
        drawArea.fill();
    };
};

function setup() {
    particles = [];
    resizeReset();
    for (let i = 0; i < opts.particleAmount; i++) {
        particles.push(new Particle());
    }
    window.requestAnimationFrame(loop);
}

function loop() {
    window.requestAnimationFrame(loop);
    drawArea.clearRect(0, 0, w, h);
    for (let i = 0; i < particles.length; i++) {
        particles[i].update();
        particles[i].draw();
    }
    for (let i = 0; i < particles.length; i++) {
        linkPoints(particles[i], particles);
    }
}



window.addEventListener('load', function () {
    check()
})



window.addEventListener("resize", function () {
    deBouncer();
});
resizeReset();
setup();
init()
