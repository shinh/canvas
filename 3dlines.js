var NUM_HISTS = 50;
var NUM_LINES = 50;
var SW = 640;
var SH = 480;

var MAX_DIST = 400;

var V = function(x, y, z) {
  if (this == window)
    return new V(x, y, z);
  this.x = x;
  this.y = y;
  this.z = z;

  this.assign = function(p) {
    this.x = p.x;
    this.y = p.y;
    this.z = p.z;
  };
  this.add = function(p) {
    this.x += p.x;
    this.y += p.y;
    this.z += p.z;
  };
  this.neg = function() {
    this.x = -this.x;
    this.y = -this.y;
    this.z = -this.z;
  };

  this.dist = function(p) {
    var dx = this.x - p.x;
    var dy = this.y - p.y;
    var dz = this.z - p.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  };
};

var Line = function(p, v) {
  if (this == window)
    return new Line(p, v);

  this.hist = new Array(NUM_HISTS);
  for (var i = 0; i < this.hist.length; i++) {
    this.hist[i] = V(p.x, p.y, p.z);
  }
  this.index = 0;
  this.v = v;

  this.cur = function() {
    return this.hist[this.index];
  };
  this.next = function() {
    this.index = (this.index + 1) % this.hist.length;
    return this.cur();
  };
  this.nextIndex = function(index) {
    return (index + 1) % this.hist.length;
  };
};

var Camera = function() {
  this.angle = 0;

  this.x = function() {
    return Math.cos(this.angle) * 1000;
  };
  this.y = function() {
    return Math.sin(this.angle) * 1000;
  };
  this.z = function() {
    return 0;
  };
  this.p = function() {
    return V(this.x(), this.y(), this.z());
  };

  this.move = function() {
    this.angle += 0.003;
  }
};

var Timer = function() {
  this.times = new Array(60);
  for (var i = 0; i < this.times.length; i++) {
    this.times[i] = new Date().getTime();
  }
  this.index = 0;

  this.move = function() {
    this.index = (this.index + 1) % this.times.length;
    var prev = this.times[this.index];
    var now = new Date().getTime();
    this.times[this.index] = now;
    var diff = now - prev;
    if (diff == 0) {
      return "???";
    }
    var fps = this.times.length * 1000 / diff;
    var fpsInt = Math.floor(fps);
    return fpsInt + "." + Math.round((fps - fpsInt) * 100);
  };
};

var camera = null;
var timer = null;
var lines = [];
var out = V(0, 0, 0);

var make2d = null;

var make2d_funcs = {
  "xz" : function(p, c) {
    out.x = p.x - c.x + SW / 2;
    out.y = p.z - c.z + SH / 2;
    out.z = 255;
  },
  "xy" : function(p, c) {
    out.x = p.x - c.x + SW / 2;
    out.y = p.y - c.y + SH / 2;
    out.z = 255;
  },
  "xz_p3d" : function(p, c) {
    var dz = (p.y - c.y + MAX_DIST) * 0.5 / MAX_DIST;
    var r = 1 / (dz + 1);
    out.x = (p.x - c.x) * r + SW / 2;
    out.y = (p.z - c.z) * r + SH / 2;
    out.z = Math.round(255 - dz * 200);
  },
  "bug" : function(p, c) {
    var dz = (p.y - c.y);
    var r = 1 / (dz + 1);
    out.x = (p.x - c.x) * r + SW / 2;
    out.y = (p.z - c.z) * r + SH / 2;
    out.z = Math.round(255 - dz * 200);
  }
};

var DEFAULT_MAKE2D_FUNC = "xz_p3d";

var zeffect = null;

var zeffect_funcs = {
  "width": function(ctx, z) {
    ctx.lineWidth = z * 0.02;
  },
  "color": function(ctx, z) {
    ctx.strokeStyle = ['rgb(', z, ',', z, ',', z, ')'].join('');
  },
  "w+c": function(ctx, z) {
    ctx.lineWidth = z * 0.02;
    ctx.strokeStyle = ['rgb(', z, ',', z, ',', z, ')'].join('');
  }
};

var DEFAULT_ZEFFECT_FUNC = "w+c";

var CATEGORIES = [
  {
    "id": "make2d",
    "name": "3D=>2D",
    "funcs": make2d_funcs,
    "default_func": DEFAULT_MAKE2D_FUNC
  },
  {
    "id": "zeffect",
    "name": "Z effect",
    "funcs": zeffect_funcs,
    "default_func": DEFAULT_ZEFFECT_FUNC
  }
];
var category_map = {};

function log(msg) {
  document.getElementById("console").innerHTML += msg + "<br>";
}

function initLine(cp) {
  var pg = function() { return Math.random() * 200 - 100; };
  var t = Math.random() * Math.PI * 2;
  var p = Math.random() * Math.PI;
  var vr = 20;
  var vx = vr * Math.sin(t) * Math.cos(p);
  var vy = vr * Math.sin(t) * Math.sin(p);
  var vz = vr * Math.cos(t);
  return Line(V(cp.x + pg(), cp.y + pg(), cp.z + pg()), V(vx, vy, vz));
}

function selectCategory(self) {
  var id = self.name;
  window[id] = category_map[id].funcs[self.value];
}

function initUI() {
  var html = "";
  for (var i = 0; i < CATEGORIES.length; i++) {
    var category = CATEGORIES[i];

    category_map[category.id] = category;

    html += ['<div>', category.name, ': '].join('');
    var funcs = category.funcs;
    for (var key in funcs) {
      checked = "";
      if (key == category.default_func) {
        checked = " checked";
      }
      html += ['<input type="radio" name="', category.id, '" value="',
               key, '"', checked,
               ' onclick="selectCategory(this)">', key].join('');
    }
  }
  document.getElementById("ui").innerHTML = html;
}

function init() {
  initUI();

  make2d = make2d_funcs[DEFAULT_MAKE2D_FUNC];
  zeffect = zeffect_funcs[DEFAULT_ZEFFECT_FUNC];

  timer = new Timer();

  camera = new Camera();
  var cp = camera.p();
  for (var i = 0; i < NUM_LINES; i++) {
    lines[i] = initLine(cp);
  }

  log("init done");
  cont();
}

function cont() {
  setTimeout("run();", 16);
}

function reflect(d, n, v, c) {
  if (Math.abs(n[d] - c) > MAX_DIST) {
    v[d] = -v[d];

    for (var j = 0; Math.abs(n[d] - c) > MAX_DIST; j++) {
      if (j > 10) {
        return false;
      }
      n[d] += v[d];
    }
  }
  return true;
}

function move() {
  document.getElementById("fps").textContent = timer.move();

  camera.move();
  var cp = camera.p();

  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];
    var p = line.cur();
    var n = line.next();
    n.assign(p);
    n.add(line.v);

    if (!reflect("x", n, line.v, cp.x) ||
        !reflect("y", n, line.v, cp.y) ||
        !reflect("z", n, line.v, cp.z)) {
      lines[i] = initLine(cp);
    }
  }
}

function draw() {
  var canvas = document.getElementById("canvas");
  var ctx = canvas.getContext("2d");
  ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
  ctx.globalCompositeOperation = "source-over";
  ctx.fillRect(0, 0, SW, SH);

  ctx.strokeStyle = 'rgb(255, 255, 255)';
  ctx.fillStyle = 'rgb(255, 255, 255)';
  var cp = camera.p();
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];
    var k = 0;
    for (var j = line.nextIndex(line.index); j != line.index; j = k) {
      var k = line.nextIndex(j);
      var p = line.hist[j];
      var n = line.hist[k];

      ctx.beginPath();
      make2d(p, cp);
      if (out.z <= 0) continue;
      zeffect(ctx, out.z);
      ctx.moveTo(out.x, out.y);
      make2d(n, cp);
      ctx.lineTo(out.x, out.y);
      ctx.stroke();
    }
  }
}

function run() {
  move();
  draw();
  cont();
}
