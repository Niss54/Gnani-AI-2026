const {test} = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
const Module = require("node:module");

function loadTs(path, imports) {
  const mod = new Module(path);
  mod.require = name => {
    assert.ok(name in imports, "unexpected dependency " + name);
    return imports[name];
  };
  const source = ts.transpileModule(fs.readFileSync(path, "utf8"), {
    compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022}
  });
  mod._compile(source.outputText, path);
  return mod.exports;
}
const helper = loadTs("frontend/lib/invoice-action.ts", {"./voice-client": {
  backendBaseUrl: () => "https://ledger.example", normalizeVoiceLanguage: () => "en-IN"
}});
for (const action of ["call","notify","checkout"]) {
  test(action + " requires operator identity and forwards only authorized inputs", async t => {
    const {POST} = loadTs("frontend/app/api/" + action + "/route.ts", {"@/lib/invoice-action": helper});
    const upstream = t.mock.method(global, "fetch", async () => Response.json({success:true}, {status:202}));
    const req = (body, auth) => new Request("https://local.example", {method:"POST",
      headers:auth ? {Authorization:"Bearer test"} : {}, body:JSON.stringify(body)});
    assert.equal((await POST(req({},false))).status,401);
    assert.equal((await POST(req({invoiceId:"i"},true))).status,400);
    if (action === "notify") assert.equal((await POST(req({invoiceId:"i",channel:"sms"},true))).status,422);
    assert.equal(upstream.mock.callCount(),0);
    assert.equal((await POST(req({invoiceId:"i",requestId:"r",email:"untrusted",amount:1},true))).status,202);
    const [url, options] = upstream.mock.calls[0].arguments;
    assert.equal(url,"https://ledger.example/v1/voice/invoices/i/actions/" + action);
    assert.deepEqual(JSON.parse(options.body),{request_id:"r",language_mode:"en-IN",discount_bps:0});
    assert.equal(options.headers.Authorization,"Bearer test");
  });
}
