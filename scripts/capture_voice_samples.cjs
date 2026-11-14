// Exercise the signed TTS route with two project-authored review prompts.
// Audio stays local. This command does not initiate a call.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const output = path.join(root, 'artifacts', 'evaluation', 'listening', crypto.randomUUID());
const samples = [
  ['en-IN', "Take your time. You mentioned a different invoice amount. What amount do you see?"],
  ['hi-en', 'Aap aaraam se bataiye. Aapne kaha invoice ka amount alag hai. Aapko kitna dikh raha hai?'],
];

async function main() {
  for (const filename of ['frontend/.env', '.env']) {
    const file = path.join(root, filename);
    if (fs.existsSync(file)) process.loadEnvFile(file);
  }
  process.env.VOICE_MEDIA_SIGNING_KEY = crypto.randomBytes(32).toString('hex');
  fs.mkdirSync(output, { recursive: true });
  for (const [source, target] of [
    ['frontend/lib/voice-media.ts', 'voice-media'],
    ['frontend/app/api/tts/route.ts', 'tts-route'],
  ]) {
    const code = fs.readFileSync(path.join(root, source), 'utf8').replace('@/lib/voice-media', './voice-media');
    const compiled = ts.transpileModule(code, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
    fs.writeFileSync(path.join(output, target + '.js'), compiled.outputText);
  }
  const { GET } = require(path.join(output, 'tts-route.js'));
  const { signedSpeechUrl } = require(path.join(output, 'voice-media.js'));
  const clips = [];
  for (const [language, prompt] of samples) {
    const url = signedSpeechUrl('https://voice.localhost', prompt, language);
    const response = await GET(new Request(url));
    if (!response.ok) {
      console.error(language, 'TTS route status', response.status);
      continue;
    }
    const file = language + '.wav';
    const source = path.join(output, language + '.source');
    fs.writeFileSync(source, Buffer.from(await response.arrayBuffer()));
    execFileSync('ffmpeg', ['-v', 'error', '-i', source, '-ac', '1', '-ar', '8000', '-c:a', 'pcm_s16le', path.join(output, file)]);
    clips.push({ id: language, language, kind: 'tts', path: file, sha256: crypto.createHash('sha256').update(fs.readFileSync(path.join(output, file))).digest('hex'),
      reference: prompt, ratings: [] });
  }
  fs.writeFileSync(path.join(output, 'listening.json'), JSON.stringify({ schema: 1, capture: 'provider_sample', clips }, null, 2));
  console.log('Captured', clips.length, 'of', samples.length, 'provider previews in', output);
  if (clips.length !== samples.length) process.exitCode = 1;
}
main().catch(error => { console.error(error.name, 'sample capture failed'); process.exitCode = 1; });
