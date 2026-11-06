const http = require('http');
http.createServer((req,res)=>{res.writeHead(200);res.end('Bot is running');}).listen(process.env.PORT || 3000);
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const ytdl = require('yt-dlp-exec');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs-extra');

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('auth');
const sock = makeWASocket({auth: state, printQRInTerminal: false});
sock.ev.on('creds.update', saveCreds);
if(!sock.authState.creds.registered){
const code = await sock.requestPairingCode('919179555144');
console.log('PAIRING CODE:', code);
}

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;
    const text = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
    const from = msg.key.remoteJid;

    if (text.includes('youtu.be') || text.includes('youtube.com')) {
      await sock.sendMessage(from, { text: '🔥 Link mil gaya! 3 Clips bana raha hu... 4-5 min lagega. Ruko...' });
      
      const videoId = Date.now().toString();
      const outputDir = `./clips_${videoId}`;
      await fs.ensureDir(outputDir);

      try {
        await ytdl(text, { output: `${outputDir}/full.mp4`, format: 'mp4' });

        const clips = [[0,45],[45,90],[90,135]];
        for (let i=0; i<clips.length; i++) {
          const [start, duration] = clips[i];
          const clipPath = `${outputDir}/clip${i+1}.mp4`;
          
          await new Promise((resolve) => {
            ffmpeg(`${outputDir}/full.mp4`)
              .setStartTime(start).setDuration(duration)
              .videoFilters([
                "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2",
                "drawtext=text='@ClipHunter':fontcolor=white:fontsize=28:x=w-tw-15:y=15:box=1:boxcolor=black@0.5"
              ])
              .output(clipPath).on('end', resolve).on('error', resolve).run();
          });

          const thumbPath = `${outputDir}/thumb${i+1}.jpg`;
          await new Promise((resolve) => {
            ffmpeg(clipPath).screenshots({ timestamps: ['50%'], filename: `thumb${i+1}.jpg`, folder: outputDir, size: '1080x1920' }).on('end', resolve).on('error', resolve);
          });

          const title = `Viral Best Moment Part ${i+1} 🔥`;
          const hashtags = `#viral #shorts #trending #ramayana`;

          await sock.sendMessage(from, { video: fs.readFileSync(clipPath), caption: `*Clip ${i+1}*\n\n📝 ${title}\n\n${hashtags}` });
          if (fs.existsSync(thumbPath)) {
            await sock.sendMessage(from, { image: fs.readFileSync(thumbPath), caption: `🖼️ Thumbnail ${i+1}` });
          }
        }
        await sock.sendMessage(from, { text: '✅ Ho gaya! 3 Clips ready hai.' });
      } catch(e) {
        await sock.sendMessage(from, { text: '❌ Error aaya: ' + e.message });
      }
    }
  });
}
startBot();
