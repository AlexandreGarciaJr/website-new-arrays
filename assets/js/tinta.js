/* =========================================================
   New Arrays | Fumaça do Hero
   EFEITO: fumaça azul petróleo sobe devagar sobre o preto. O cursor
   não só desloca a imagem: ele sopra a fumaça. Uma simulação de
   fluido (Navier-Stokes simplificado, "stable fluids") recebe uma
   rajada radial + a direção do movimento, e a fumaça se dispersa,
   gira (confinamento de vorticidade) e volta a preencher o espaço.
   A fumaça fica no Hero. Na rolagem (cena de abertura), ela se
   expande, se quebra em fiapos e se dissipa enquanto os pilares surgem.
   TECNOLOGIA: WebGL puro (WebGL2, com WebGL1 + half float como
   alternativa). Sem Three.js.
   PERFORMANCE: começa depois do load, simulação em baixa resolução,
   DPR limitado, pausa fora da tela e com a aba oculta, reduz a
   resolução sozinho se a GPU não acompanhar e não roda em GPU por
   software (SwiftShader/llvmpipe), onde fica o fundo estático.
   MOVIMENTO REDUZIDO: simula alguns passos, desenha um quadro e para.
   Teste em ambiente sem GPU: ?tinta=forcar
   ========================================================= */
(function () {
  "use strict";
  var canvas = document.querySelector(".tinta");
  var hero = document.querySelector(".hero");
  if (!canvas || !hero) return;

  var reduzido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var toque = window.matchMedia("(pointer: coarse)").matches;
  var forcar = /[?&]tinta=forcar/.test(location.search);
  var estado = { disp: 0, brilho: 0, brilhoAlvo: 0, form: false };
  var abertura = document.querySelector(".abertura");
  window.NA_tinta = {
    scroll: function () {},
    brilho: function (v) { estado.brilhoAlvo = v; }
  };
  document.addEventListener("na:form", function (e) { estado.form = e.detail.aberto; });

  var CFG = {
    SIM: toque ? 96 : 128,          // resolução da velocidade/pressão
    DYE: toque ? 320 : 512,         // resolução da fumaça
    DISSIP_DENS: 0.08,              // quanto a fumaça some por segundo (maior = some mais rápido)
    DISSIP_VEL: 0.5,
    PRESSAO: 0.8,
    ITER: toque ? 14 : 20,
    CURL: 14,                       // quanto a fumaça "enrola"
    RAIO_CURSOR: 0.008,            // área de dispersão do cursor
    FORCA_CURSOR: 6500,
    RAJADA: 70,                   // empurrão radial (dispersão)
    EMPUXO: 24,                   // quanto a fumaça sobe sozinha
    SUBIDA: 22,
    TURBULENCIA: 24,              // correntes lentas que espalham a fumaça pela tela
    TEMPO: 0.5,                   // velocidade geral da simulação (1 = tempo real; menor = mais lento)
    DISPERSAO_FIM: 0.4            // em que ponto da cena de abertura (0 a 1) a fumaça termina de se dissipar
  };

  function iniciar() {
    var gl = canvas.getContext("webgl2", { alpha: true, antialias: false, depth: false, stencil: false, premultipliedAlpha: true, powerPreference: "low-power" });
    var gl2 = !!gl;
    if (!gl) gl = canvas.getContext("webgl", { alpha: true, antialias: false, depth: false, stencil: false, premultipliedAlpha: true, powerPreference: "low-power" });
    if (!gl) return;

    var dbg = gl.getExtension("WEBGL_debug_renderer_info");
    var gpu = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : "";
    if (!forcar && /swiftshader|llvmpipe|software|softpipe|basic render/i.test(gpu)) { perder(); return; }

    // formato de textura em ponto flutuante (half float)
    var fmt;
    if (gl2) {
      if (!gl.getExtension("EXT_color_buffer_float") && !gl.getExtension("EXT_color_buffer_half_float")) { perder(); return; }
      fmt = { interno: gl.RGBA16F, formato: gl.RGBA, tipo: gl.HALF_FLOAT };
    } else {
      var hf = gl.getExtension("OES_texture_half_float");
      if (!hf || !gl.getExtension("OES_texture_half_float_linear")) { perder(); return; }
      fmt = { interno: gl.RGBA, formato: gl.RGBA, tipo: hf.HALF_FLOAT_OES };
    }
    function perder() { var e = gl.getExtension("WEBGL_lose_context"); if (e) e.loseContext(); }

    /* ---------- shaders ---------- */
    var VS = [
      "precision highp float;attribute vec2 p;uniform vec2 tx;",
      "varying vec2 vUv,vL,vR,vT,vB;",
      "void main(){vUv=p*.5+.5;vL=vUv-vec2(tx.x,0.);vR=vUv+vec2(tx.x,0.);vT=vUv+vec2(0.,tx.y);vB=vUv-vec2(0.,tx.y);gl_Position=vec4(p,0.,1.);}"
    ].join("\n");
    var H = "precision highp float;precision highp sampler2D;varying vec2 vUv,vL,vR,vT,vB;";

    var FS = {
      // rajada: soma velocidade (direção do cursor + empurrão radial) ou densidade
      splat: H + "uniform sampler2D uAlvo;uniform float asp;uniform vec3 cor;uniform vec2 pt;uniform float raio;uniform float radial;" +
        "void main(){vec2 d=vUv-pt;d.x*=asp;float g=exp(-dot(d,d)/raio);vec3 base=texture2D(uAlvo,vUv).xyz;" +
        "vec2 dir=length(d)>1e-5?normalize(d):vec2(0.);" +
        "gl_FragColor=vec4(base+(cor+vec3(dir*radial,0.))*g,1.);}",
      advec: H + "uniform sampler2D uVel;uniform sampler2D uFonte;uniform vec2 tx;uniform float dt;uniform float dissip;" +
        "void main(){vec2 c=vUv-dt*texture2D(uVel,vUv).xy*tx;vec4 r=texture2D(uFonte,c);gl_FragColor=r/(1.+dissip*dt);}",
      curl: H + "uniform sampler2D uVel;void main(){float L=texture2D(uVel,vL).y,R=texture2D(uVel,vR).y,T=texture2D(uVel,vT).x,B=texture2D(uVel,vB).x;gl_FragColor=vec4(.5*(R-L-T+B),0.,0.,1.);}",
      vort: H + "uniform sampler2D uVel;uniform sampler2D uCurl;uniform float curl;uniform float dt;" +
        "void main(){float L=texture2D(uCurl,vL).x,R=texture2D(uCurl,vR).x,T=texture2D(uCurl,vT).x,B=texture2D(uCurl,vB).x,C=texture2D(uCurl,vUv).x;" +
        "vec2 f=.5*vec2(abs(T)-abs(B),abs(R)-abs(L));f/=length(f)+1e-4;f*=curl*C;f.y*=-1.;" +
        "vec2 v=texture2D(uVel,vUv).xy+f*dt;gl_FragColor=vec4(clamp(v,-1000.,1000.),0.,1.);}",
      div: H + "uniform sampler2D uVel;void main(){float L=texture2D(uVel,vL).x,R=texture2D(uVel,vR).x,T=texture2D(uVel,vT).y,B=texture2D(uVel,vB).y;vec2 C=texture2D(uVel,vUv).xy;" +
        "if(vL.x<0.)L=-C.x;if(vR.x>1.)R=-C.x;if(vT.y>1.)T=-C.y;if(vB.y<0.)B=-C.y;gl_FragColor=vec4(.5*(R-L+T-B),0.,0.,1.);}",
      // empuxo + turbulência lenta (campo de ruído com rotacional): a fumaça sobe e se espalha devagar
      flutua: H + "uniform sampler2D uVel;uniform sampler2D uDye;uniform float b;uniform float dt;uniform float tt;uniform float turb;" +
        "float hh(vec2 p){return fract(sin(dot(p,vec2(41.3,289.1)))*45758.5453);}" +
        "float nn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hh(i),hh(i+vec2(1,0)),f.x),mix(hh(i+vec2(0,1)),hh(i+1.),f.x),f.y);}" +
        "float campo(vec2 p){return nn(p)+.5*nn(p*2.1+7.3);}" +
        "void main(){vec2 v=texture2D(uVel,vUv).xy;float d=texture2D(uDye,vUv).r;" +
        "vec2 p=vUv*vec2(3.,2.)+vec2(tt*.03,-tt*.02);float e=.02;" +
        "vec2 c=vec2(campo(p+vec2(0.,e))-campo(p-vec2(0.,e)),-(campo(p+vec2(e,0.))-campo(p-vec2(e,0.))))/(2.*e);" +
        "v+=c*turb*dt;v.y+=min(d,1.5)*b*dt;gl_FragColor=vec4(v,0.,1.);}",
      limpa: H + "uniform sampler2D uP;uniform float v;void main(){gl_FragColor=v*texture2D(uP,vUv);}",
      pressao: H + "uniform sampler2D uP;uniform sampler2D uDiv;void main(){float L=texture2D(uP,vL).x,R=texture2D(uP,vR).x,T=texture2D(uP,vT).x,B=texture2D(uP,vB).x,d=texture2D(uDiv,vUv).x;gl_FragColor=vec4((L+R+B+T-d)*.25,0.,0.,1.);}",
      grad: H + "uniform sampler2D uP;uniform sampler2D uVel;void main(){float L=texture2D(uP,vL).x,R=texture2D(uP,vR).x,T=texture2D(uP,vT).x,B=texture2D(uP,vB).x;vec2 v=texture2D(uVel,vUv).xy-vec2(R-L,T-B);gl_FragColor=vec4(v,0.,1.);}",
      tela: H + "uniform sampler2D uDye;uniform float t;uniform float asp;uniform float sc;uniform vec2 ponto;uniform float brilho;" +
        "float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}" +
        "float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+1.),f.x),f.y);}" +
        "float fbm(vec2 p){float s=0.,a=.5;for(int i=0;i<4;i++){s+=a*n(p);p=p*2.07+vec2(3.1,1.7);a*=.5;}return s;}" +
        // rolagem: a fumaça se expande a partir do centro, gira de leve, se quebra em fiapos e some
        "void main(){float s=clamp(sc,0.,1.);s=s*s*(3.-2.*s);" +
        "vec2 q=vUv-ponto;q.x*=asp;float r=length(q);" +
        "float ang=s*.9*exp(-r*1.4);float ca=cos(ang),sa=sin(ang);q=mat2(ca,-sa,sa,ca)*q;" +
        "q/=1.+s*1.7;q.x/=asp;vec2 u=ponto+q;" +
        "float d=texture2D(uDye,clamp(u,0.,1.)).r;" +
        // textura de fiapos: a fumaça nunca parece uma mancha lisa
        "float w=fbm(vec2(u.x*asp,u.y)*3.2+vec2(0.,-t*.012));d*=mix(.45,1.45,w);" +
        "float fum=1.-exp(-pow(max(d,0.),1.7)*1.5);" +
        "fum*=(.5+.5*smoothstep(0.,.85,vUv.x))*smoothstep(1.02,.8,vUv.y);" +
        // dispersão: os fiapos se separam (limiar cresce) e a opacidade cai
        "float w2=fbm(vec2(vUv.x*asp,vUv.y)*5.+vec2(s*1.5,-s));fum*=smoothstep(s*.95-.05,s*.95+.2,w2*1.15);" +
        "fum*=(1.-s)*(1.-s*.5);" +
        "fum*=1.+brilho*.3;" +
        "vec3 base=vec3(.027,.25,.286),luz=vec3(.3,.7,.76);" +
        "vec3 c=mix(base,luz,smoothstep(.45,1.,fum)*.62);float a=clamp(fum,0.,.9);" +
        "gl_FragColor=vec4(c*a,a);}"
    };

    function compilar(tipo, src) {
      var s = gl.createShader(tipo); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    }
    var vs = compilar(gl.VERTEX_SHADER, VS);
    function programa(fs) {
      var p = gl.createProgram();
      gl.attachShader(p, vs); gl.attachShader(p, compilar(gl.FRAGMENT_SHADER, fs));
      gl.bindAttribLocation(p, 0, "p"); gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
      var u = {}, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
      for (var i = 0; i < n; i++) { var inf = gl.getActiveUniform(p, i); u[inf.name] = gl.getUniformLocation(p, inf.name); }
      return { p: p, u: u };
    }
    var P = {};
    try { for (var k in FS) P[k] = programa(FS[k]); } catch (e) { return; }

    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    /* ---------- alvos de renderização ---------- */
    function alvo(w, h) {
      var t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, fmt.interno, w, h, 0, fmt.formato, fmt.tipo, null);
      var f = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, f);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
      gl.viewport(0, 0, w, h); gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT);
      return { t: t, f: f, w: w, h: h, tx: [1 / w, 1 / h] };
    }
    function duplo(w, h) {
      var a = alvo(w, h), b = alvo(w, h);
      return { ler: a, esc: b, troca: function () { var x = this.ler; this.ler = this.esc; this.esc = x; } };
    }
    function liberar(o) { if (!o) return; [o.ler || o, o.esc].forEach(function (a) { if (a) { gl.deleteTexture(a.t); gl.deleteFramebuffer(a.f); } }); }

    var W = 2, Ht = 2, vel, dye, divg, curlT, pres, asp = 1;
    var ESCALA = toque ? 0.5 : 0.75;
    function tam(base) {
      var a = window.innerWidth / window.innerHeight;
      return a > 1 ? { w: Math.round(base * a), h: base } : { w: base, h: Math.round(base / a) };
    }
    function medir() {
      var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      W = Math.max(2, Math.round(window.innerWidth * dpr * ESCALA));
      Ht = Math.max(2, Math.round(window.innerHeight * dpr * ESCALA));
      canvas.width = W; canvas.height = Ht;
      asp = window.innerWidth / window.innerHeight;
      var s = tam(CFG.SIM), d = tam(CFG.DYE);
      [vel, dye, pres].forEach(liberar); [divg, curlT].forEach(liberar);
      vel = duplo(s.w, s.h); dye = duplo(d.w, d.h); pres = duplo(s.w, s.h);
      divg = alvo(s.w, s.h); curlT = alvo(s.w, s.h);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      if (gl.checkFramebufferStatus && gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) { /* padrão ok */ }
    }
    medir();
    // confirma que dá para renderizar em half float (alguns celulares mentem)
    gl.bindFramebuffer(gl.FRAMEBUFFER, vel.ler.f);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) { perder(); return; }

    function usar(pr, destino, tx) {
      gl.useProgram(pr.p);
      if (tx && pr.u.tx) gl.uniform2f(pr.u.tx, tx[0], tx[1]);
      if (destino) { gl.bindFramebuffer(gl.FRAMEBUFFER, destino.f); gl.viewport(0, 0, destino.w, destino.h); }
      else { gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, W, Ht); }
    }
    function tex(unidade, t) { gl.activeTexture(gl.TEXTURE0 + unidade); gl.bindTexture(gl.TEXTURE_2D, t); return unidade; }
    function desenhar() { gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); }

    function splat(alvoD, x, y, cor, raio, radial) {
      usar(P.splat, alvoD.esc, alvoD.ler.tx);
      gl.uniform1i(P.splat.u.uAlvo, tex(0, alvoD.ler.t));
      gl.uniform1f(P.splat.u.asp, asp);
      gl.uniform2f(P.splat.u.pt, x, y);
      gl.uniform3f(P.splat.u.cor, cor[0], cor[1], cor[2]);
      gl.uniform1f(P.splat.u.raio, raio);
      gl.uniform1f(P.splat.u.radial, radial || 0);
      desenhar(); alvoD.troca();
    }

    var relogioSim = 0;
    function passo(dt) {
      var tx = vel.ler.tx;
      // empuxo: fumaça densa sobe, formando plumas
      usar(P.flutua, vel.esc, tx); gl.uniform1i(P.flutua.u.uVel, tex(0, vel.ler.t)); gl.uniform1i(P.flutua.u.uDye, tex(1, dye.ler.t));
      gl.uniform1f(P.flutua.u.b, CFG.EMPUXO); gl.uniform1f(P.flutua.u.dt, dt); gl.uniform1f(P.flutua.u.tt, relogioSim); gl.uniform1f(P.flutua.u.turb, CFG.TURBULENCIA); desenhar(); vel.troca();
      relogioSim += dt;
      usar(P.curl, curlT, tx); gl.uniform1i(P.curl.u.uVel, tex(0, vel.ler.t)); desenhar();
      usar(P.vort, vel.esc, tx); gl.uniform1i(P.vort.u.uVel, tex(0, vel.ler.t)); gl.uniform1i(P.vort.u.uCurl, tex(1, curlT.t));
      gl.uniform1f(P.vort.u.curl, CFG.CURL); gl.uniform1f(P.vort.u.dt, dt); desenhar(); vel.troca();
      usar(P.div, divg, tx); gl.uniform1i(P.div.u.uVel, tex(0, vel.ler.t)); desenhar();
      usar(P.limpa, pres.esc, tx); gl.uniform1i(P.limpa.u.uP, tex(0, pres.ler.t)); gl.uniform1f(P.limpa.u.v, CFG.PRESSAO); desenhar(); pres.troca();
      usar(P.pressao, null, tx); gl.uniform1i(P.pressao.u.uDiv, tex(1, divg.t));
      for (var i = 0; i < CFG.ITER; i++) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, pres.esc.f); gl.viewport(0, 0, pres.esc.w, pres.esc.h);
        gl.uniform1i(P.pressao.u.uP, tex(0, pres.ler.t)); desenhar(); pres.troca();
      }
      usar(P.grad, vel.esc, tx); gl.uniform1i(P.grad.u.uP, tex(0, pres.ler.t)); gl.uniform1i(P.grad.u.uVel, tex(1, vel.ler.t)); desenhar(); vel.troca();
      // advecção da velocidade e da fumaça
      usar(P.advec, vel.esc, tx);
      gl.uniform1i(P.advec.u.uVel, tex(0, vel.ler.t)); gl.uniform1i(P.advec.u.uFonte, tex(0, vel.ler.t));
      gl.uniform1f(P.advec.u.dt, dt); gl.uniform1f(P.advec.u.dissip, CFG.DISSIP_VEL); desenhar(); vel.troca();
      usar(P.advec, dye.esc, tx);
      gl.uniform1i(P.advec.u.uVel, tex(0, vel.ler.t)); gl.uniform1i(P.advec.u.uFonte, tex(1, dye.ler.t));
      gl.uniform1f(P.advec.u.dt, dt); gl.uniform1f(P.advec.u.dissip, CFG.DISSIP_DENS); desenhar(); dye.troca();
    }

    /* ---------- fontes de fumaça: plumas que sobem do lado direito ---------- */
    var FONTES = [
      { x: 0.62, y: 0.03, f: 0.8, fase: 0 },
      { x: 0.84, y: 0.03, f: 1.0, fase: 2.1 },
      { x: 0.99, y: 0.42, f: 0.35, fase: 4.2, lado: true },
      { x: 0.99, y: 0.75, f: 0.25, fase: 5.3, lado: true },
      { x: 0.3, y: 0.02, f: 0.25, fase: 1.3 }
    ];
    function alimentar(t, dt) {
      for (var i = 0; i < FONTES.length; i++) {
        var F = FONTES[i];
        var x = F.x + Math.sin(t * 0.23 + F.fase) * 0.05, y = F.y + (F.lado ? Math.sin(t * 0.19 + F.fase) * 0.2 : 0);
        var vx = F.lado ? -CFG.SUBIDA * 1.1 : Math.sin(t * 0.5 + F.fase) * CFG.SUBIDA * 0.35, vy = F.lado ? CFG.SUBIDA * 0.25 : CFG.SUBIDA;
        splat(vel, x, y, [vx * F.f * dt * 4, vy * F.f * dt * 4, 0], 0.006, 0);
        splat(dye, x, y, [1.5 * F.f * dt, 0, 0], 0.007, 0);
      }
    }

    /* ---------- ponteiro: a rajada que dispersa ---------- */
    var PT = { x: 0.7, y: 0.5, px: 0.7, py: 0.5, mov: false, ultimo: 0 };
    function aoMover(e) {
      PT.x = e.clientX / window.innerWidth; PT.y = 1 - e.clientY / window.innerHeight;
      PT.mov = true; PT.ultimo = performance.now();
    }
    if (!reduzido) {
      window.addEventListener("pointermove", aoMover, { passive: true });
      window.addEventListener("pointerdown", function (e) {
        aoMover(e);
        // toque/clique: uma rajada forte no ponto
        PT.rajada = 1;
      }, { passive: true });
    }

    // centro da dispersão: o meio da tela, um pouco à direita (onde a fumaça é mais densa)
    var PONTO = { x: 0.62, y: 0.5 };

    /* ---------- laço ---------- */
    var rodando = false, visivel = true, raf = 0, t0 = performance.now(), antes = 0;
    var amostras = [], degraus = 0, ultimoQ = 0;
    function orcamento(agora) {
      if (ultimoQ) amostras.push(agora - ultimoQ);
      ultimoQ = agora;
      if (amostras.length < 40) return true;
      amostras.sort(function (a, b) { return a - b; });
      var mediana = amostras[20]; amostras = [];
      if (mediana > 26) {
        degraus++;
        if (degraus > 2) { rodando = false; return false; }
        CFG.ITER = Math.max(8, CFG.ITER - 6); ESCALA *= 0.75;
        var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
        W = Math.max(2, Math.round(window.innerWidth * dpr * ESCALA)); Ht = Math.max(2, Math.round(window.innerHeight * dpr * ESCALA));
        canvas.width = W; canvas.height = Ht;
      }
      return true;
    }

    function simular(agora) {
      var t = (agora - t0) / 1000;
      var dtReal = Math.min(0.033, Math.max(0.008, (agora - (antes || agora - 16)) / 1000));
      var dt = dtReal * CFG.TEMPO;
      antes = agora;

      estado.brilho += (estado.brilhoAlvo - estado.brilho) * 0.08;
      estado.disp += (alvoDisp() - estado.disp) * 0.12;
      var op = estado.disp > 0.985 ? 0 : 1;
      if (op !== canvas._op) { canvas.style.setProperty("--op", String(op)); canvas._op = op; }

      alimentar(t * CFG.TEMPO * 2, dt);

      // cursor fantasma quando ninguém mexe: a fumaça continua viva
      var ocioso = !PT.mov || agora - PT.ultimo > 2800;
      if (ocioso) {
        PT.x = 0.7 + 0.2 * Math.sin(t * 0.14) * Math.cos(t * 0.05);
        PT.y = 0.5 + 0.26 * Math.sin(t * 0.1 + 1.3);
      }
      var dx = PT.x - PT.px, dy = PT.y - PT.py, v = Math.hypot(dx * asp, dy);
      if (v > 0.0004 || PT.rajada) {
        var k = ocioso ? 0.35 : 1;
        var rad = (Math.min(1, v * 40) * CFG.RAJADA + (PT.rajada ? CFG.RAJADA * 1.6 : 0)) * k;
        splat(vel, PT.x, PT.y, [dx * CFG.FORCA_CURSOR * k, dy * CFG.FORCA_CURSOR * k, 0], CFG.RAIO_CURSOR * (PT.rajada ? 2 : 1), rad);
        PT.rajada = 0;
      }
      PT.px = PT.x; PT.py = PT.y;

      passo(dt);
      return t;
    }

    // 0 = fumaça inteira, 1 = dissipada. Na cena de abertura (desktop) segue o progresso da cena;
    // fora dela (celular, tablet), segue a saída do Hero da tela.
    function alvoDisp() {
      if (estado.form) return 0;
      var h = window.innerHeight, p;
      if (abertura && document.documentElement.classList.contains("cena-abertura")) {
        var r = abertura.getBoundingClientRect();
        p = -r.top / Math.max(1, r.height - h) / CFG.DISPERSAO_FIM;
      } else {
        var hr = hero.getBoundingClientRect();
        p = -hr.top / Math.max(1, hr.height) * 1.25;
      }
      return Math.max(0, Math.min(1, p));
    }

    function pintar(t) {
      usar(P.tela, null, dye.ler.tx);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform1i(P.tela.u.uDye, tex(0, dye.ler.t));
      gl.uniform1f(P.tela.u.t, t);
      gl.uniform1f(P.tela.u.asp, asp);
      gl.uniform1f(P.tela.u.sc, estado.disp);
      gl.uniform2f(P.tela.u.ponto, PONTO.x, PONTO.y);
      gl.uniform1f(P.tela.u.brilho, estado.brilho);
      desenhar();
    }

    function quadro(agora) {
      raf = 0;
      if (rodando && !forcar && !orcamento(agora)) return;
      // dissipada: não simula nem desenha (só confere a rolagem) até a pessoa voltar ao Hero
      if (estado.disp > 0.985 && alvoDisp() > 0.985) { if (canvas._op !== 0) { canvas.style.setProperty("--op", "0"); canvas._op = 0; } if (rodando) raf = requestAnimationFrame(quadro); ultimoQ = 0; antes = 0; return; }
      pintar(simular(agora));
      if (rodando) raf = requestAnimationFrame(quadro);
    }

    function atualizarLoop() {
      var deve = visivel && !document.hidden && !reduzido;
      if (deve && !rodando) { rodando = true; ultimoQ = 0; amostras = []; antes = 0; raf = requestAnimationFrame(quadro); }
      else if (!deve && rodando) { rodando = false; if (raf) cancelAnimationFrame(raf); raf = 0; }
    }

    new IntersectionObserver(function (e) {
      visivel = e[0].isIntersecting;
      if (!visivel) { canvas.style.setProperty("--op", "0"); canvas._op = 0; }
      atualizarLoop();
    }, { rootMargin: "45% 0px 45% 0px" }).observe(hero);
    document.addEventListener("visibilitychange", atualizarLoop);

    var tRes;
    window.addEventListener("resize", function () {
      clearTimeout(tRes);
      tRes = setTimeout(function () { medir(); preencher(24); if (!rodando) pintar((performance.now() - t0) / 1000); }, 180);
    });
    canvas.addEventListener("webglcontextlost", function (e) { e.preventDefault(); rodando = false; hero.classList.remove("tinta-ativa"); canvas.classList.remove("on"); });

    // já começa com fumaça no quadro (sem "tela vazia" enchendo)
    function preencher(n) {
      for (var i = 0; i < 22; i++) {
        var x = 0.4 + Math.random() * 0.6, y = 0.05 + Math.random() * 0.9;
        splat(dye, x, y, [0.45 + Math.random() * 0.45, 0, 0], 0.003 + Math.random() * 0.008, 0);
        splat(vel, x, y, [(Math.random() - 0.5) * 30, 10 + Math.random() * 20, 0], 0.01, 0);
      }
      var falso = performance.now() - 20000;
      for (var j = 0; j < n; j++) { alimentar(20 + j * 0.03, 0.016); passo(0.016); }
      t0 = falso;
    }
    preencher(reduzido ? 110 : 70);

    if (forcar) {
      // ganchos de teste (só com ?tinta=forcar): simulação determinística a 60 fps
      var relogio = performance.now();
      window.NA_tinta.teste = {
        parar: function () { reduzido = true; atualizarLoop(); rodando = false; },
        passos: function (n, caminho) {
          for (var i = 0; i < n; i++) {
            relogio += 1000 / 60;
            if (caminho) { var c = caminho(i / n); if (c) { PT.x = c[0]; PT.y = 1 - c[1]; PT.mov = true; PT.ultimo = relogio; } }
            var tt = simular(relogio);
          }
          pintar(tt || 0);
        }
      };
    }
    if (reduzido) pintar(20);
    else atualizarLoop();
    requestAnimationFrame(function () { hero.classList.add("tinta-ativa"); canvas.classList.add("on"); });
  }

  function quandoOcioso() {
    if ("requestIdleCallback" in window) requestIdleCallback(iniciar, { timeout: 1200 });
    else setTimeout(iniciar, 200);
  }
  if (document.readyState === "complete") quandoOcioso();
  else window.addEventListener("load", quandoOcioso, { once: true });
})();
