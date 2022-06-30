const { default: axios } = require('axios')
const { exec } = require('child_process')
const express = require('express')
const { readFileSync, existsSync, mkdirSync } = require('fs')
const morgan = require('morgan')
const serveIndex = require('serve-index')
const cors = require('cors')
const app = express()
const port = process.env.PORT || 5000
const spotdlPORT = 8800
const web_url = process.env.HOSTNAME_URL || 'http://localhost:5000'
exec('spotdl web', (error, stdout, stderr) => {
    // if (error) throw new Error('Spotdl is not installed, API can\'t be running')
    // if (stderr) throw new Error('Spotdl is not installed, API can\'t be running')
})
if(!existsSync('./public')) mkdirSync('./public')
app.use(express.static('./public'))
app.use('/public', express.static('public'), serveIndex('public', {'icons': true}))
app.use(morgan('dev'))
app.use(cors())
app.get('/', (req, res) => {
    res.json({"status": "Actions Restricted"})
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
                const split = stdout.split(`"`)
                data.download_url = `${web_url}/${encodeURIComponent(split[1])}.mp3`
    
                res.json(data)
            }
            if(stderr) res.json(JSON.stringify({status: "failed", reason: "A unexpected error"}))
        })
    }
    
})

app.listen(port, () => console.log('Server is listening on port ' + port))
