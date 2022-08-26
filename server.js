const { default: axios } = require('axios')
const { exec, execSync } = require('child_process')
const express = require('express')
const { readFileSync, existsSync, mkdirSync, readdirSync } = require('fs')
const morgan = require('morgan')
const serveIndex = require('serve-index')
const cors = require('cors')
const app = express()
const port = process.env.PORT || 5000
const spotdlPORT = 8800
const web_url = process.env.HOSTNAME_URL || 'http://localhost:5000'
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

if(!existsSync('./public')) mkdirSync('./public')


async function main() {
    exec('spotdl web --no-cache', (error, stdout, stderr) => {
        // if (error) throw new Error('Spotdl is not installed, API can\'t be running')
        // if (stderr) throw new Error('Spotdl is not installed, API can\'t be running')
    })
    await delay(8000)
    app.use(express.static('./public'))
    app.use('/public', express.static('public'), serveIndex('public', {'icons': true}))
    app.use(morgan('dev'))
    app.use(cors())
    app.get('/', (req, res) => {
        res.json({"status": "Actions Restricted"})
    })
    app.get('/version', (req, res) => {
        const version = execSync('spotdl -v').toString().trim()
        res.json(JSON.parse(JSON.stringify({version: version})))
    })
    app.post('/info', async (req, res) => {
        const query = req.query.url.split('&')[0]
        console.log(query);
        const result = await axios({
            url: `http://localhost:${spotdlPORT}/api/song/url?url=${encodeURIComponent(query)}`,
            method: 'GET'
        })
        res.json(result.data)
    })
    app.post('/download', async (req, res) => {
        const url = req.query.url.split('&')[0]
        if(!url) res.json({"status": "failed", "reason": "please input link in query"})
        const {data} = await axios({
            url: `http://localhost:${spotdlPORT}/api/song/url?url=${encodeURIComponent(url)}`,
            method: 'GET'
        })
        // const cache = JSON.parse(readFileSync('./cache/cache.json'))
        const filename = `${data.artists.length > 0 ? data.artists.join(', '): data.artists[0]} - ${data.name}.mp3`
        if (existsSync(`./public/${filename}`)) {
            data.download_url = `${web_url}/${encodeURIComponent(filename)}`
            res.json(data)
        } else {
            exec(`spotdl download ${url} --bitrate 320k --output public`, (err, stdout, stderr) => {
                if (err) res.json(JSON.stringify({status: "failed", reason: "A unexpected error"}))
                if (stdout) {
                    if(stdout.includes('Skipping')) {
                        const split = stdout.split('Skipping ')[1].replace('\r\n\r\n', "")
                        const listDir = readdirSync('./public')
                        const findMusic = listDir.find(file => file.includes(data.name))
                        data.download_url = `${web_url}/${encodeURIComponent(findMusic)}`
                        res.json(data)
                    } else {
                        const listDir = readdirSync('./public')
                        const findMusic = listDir.find(file => file.includes(data.name))
                        data.download_url = `${web_url}/${encodeURIComponent(findMusic)}`
                        res.json(data)
                    }
                    
                }
                if(stderr) res.json(JSON.stringify({status: "failed", reason: "A unexpected error"}))
            })
        }
        
    })
    app.post('/search', async (req, res) => {
        const query = req.query.query
        // console.log(query);
        const {data} = await axios.get(`http://localhost:${spotdlPORT}/api/songs/search?query=${query}`)
        res.send(data)
    })
    app.listen(port, () => console.log('Server is listening on port ' + port))
}
main()