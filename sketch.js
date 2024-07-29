let video;
let videoSourceSelect;
let previousFrame;
let points = [];
let draggingPoint = null;
let homographyMode = false;
let transformedImage;
let active_number = -1;
let is_pc = true;
let p5canvas;

let defaults = {
    camera: {
        width: 1280,
        height: 720,
        fps: 30
    }
}

function setup() {
    pixelDensity(1.0);
    transformedImage = createGraphics(defaults.camera.width, defaults.camera.height);
    let c = p5canvas = createCanvas(defaults.camera.width, defaults.camera.height);



    frameRate(defaults.camera.fps);
    c.parent('p5canvas');
    // cを縦横比を固定して横幅100%表示にする
    c.style('height', 'auto');
    c.style('width', '100%');
    c.doubleClicked(toggleFullScreen);

    document.querySelector('#debug_text').innerHTML = `${navigator.userAgent}\n`;
    if (navigator.userAgent.indexOf('iPhone') > 0 ||
        navigator.userAgent.indexOf('iPod') > 0 ||
        (navigator.userAgent.indexOf('Android') > 0 &&
            navigator.userAgent.indexOf('Mobile') > 0)) {
        //スマホ用の処理
        c.touchStarted(cmousePressed);
        c.touchMoved(cmouseDragged);
        c.touchEnded(cmouseReleased);
        disable_scroll();
        is_pc = false;
    } else if (navigator.userAgent.indexOf('iPad') > 0 ||
        navigator.userAgent.indexOf('Android') > 0) {
        //タブレット用の処理
        c.touchStarted(cmousePressed);
        c.touchMoved(cmouseDragged);
        c.touchEnded(cmouseReleased);
        disable_scroll();
        is_pc = false;
    } else if (navigator.userAgent.indexOf('Safari') > 0 &&
        navigator.userAgent.indexOf('Chrome') == -1 &&
        typeof document.ontouchstart !== 'undefined') {
        //iOS13以降のiPad用の処理
        c.touchStarted(cmousePressed);
        c.touchMoved(cmouseDragged);
        c.touchEnded(cmouseReleased);
        disable_scroll();
        is_pc = false;
    } else {
        c.mousePressed(cmousePressed);
        c.mouseMoved(cmouseDragged);
        c.mouseReleased(cmouseReleased);
        is_pc = true;
    }


    videoSourceSelect = select('#videoSource');
    videoSourceSelect.changed(initVideo);

    // デフォルトの4点をランダムにしないで設定
    points = [
        { x: 500, y: 100 },
        { x: 1180, y: 100 },
        { x: 1180, y: 620 },
        { x: 500, y: 620 }
    ];
    // もしlocalStorageにpoints情報があればそれを使う
    let savedPoints = localStorage.getItem('slidecapture.points');
    if (savedPoints) {
        points = JSON.parse(savedPoints);
    }
    // もし取得したpointsがcanvasサイズからはみでていれば初期値に戻す
    for (let i = 0; i < points.length; i++) {
        if (points[i].x < 0 || points[i].x > width || points[i].y < 0 || points[i].y > height) {
            points = [
                { x: 500, y: 100 },
                { x: 1180, y: 100 },
                { x: 1180, y: 620 },
                { x: 500, y: 620 }
            ];
            break;
        }
    }

    initVideo();


    // fullscreenchangeイベントを監視
    document.addEventListener('fullscreenchange', (event) => {
        if (!document.fullscreenElement) {
            homographyMode = false;
            document.querySelector('#control_ui').style.display = '';
        }
        const aspect = getAspectRatio();
        if (homographyMode) {
            resizeCanvas(width, width * aspect);
        }
        else {
            resizeCanvas(defaults.camera.width, defaults.camera.height);
        }
        p5canvas.style('height', 'auto');
        p5canvas.style('width', '100%');
    });
}

function getAspectRatio() {
    let aspect;
    if (document.querySelector('#aspect').value == "fit") {
        aspect = parseFloat(displayHeight / displayWidth);
    }
    else {
        aspect = parseFloat(document.querySelector('#aspect').value);
    }
    return aspect;
}
// スクロール禁止
function disable_scroll() {
    // PCでのスクロール禁止
    document.addEventListener("mousewheel", scroll_control, { passive: false });
    // スマホでのタッチ操作でのスクロール禁止
    document.addEventListener("touchmove", scroll_control, { passive: false });
}
// スクロール禁止解除
function enable_scroll() {
    // PCでのスクロール禁止解除
    document.removeEventListener("mousewheel", scroll_control, { passive: false });
    // スマホでのタッチ操作でのスクロール禁止解除
    document.removeEventListener('touchmove', scroll_control, { passive: false });
}

// スクロール関連メソッド
function scroll_control(event) {
    event.preventDefault();
}

function initVideo() {
    if (video) {
        video.remove();
    }

    let constraints = {
        video: {
            deviceId: videoSourceSelect.value(),
            facingMode: { ideal: "environment" },
            width: { ideal: defaults.camera.width },
            height: { ideal: defaults.camera.height },
            frameRate: { ideal: defaults.camera.fps }
        },
        audio: false
    };

    // deviceidをlocalStorageに保存
    localStorage.setItem('slidecapture.deviceId', videoSourceSelect.value());

    video = createCapture(constraints, () => {
        video.hide();
    });


}

function draw() {
    background(0);


    // videoが読み込まれていれば
    if (video.loadedmetadata) {
        video.loadPixels();
        if (!homographyMode) {
            image(video, 0, 0, width, height);

            // 矩形領域の塗りつぶしを透明度20%に設定
            fill(255, 0, 0, 51); // 透明度20%
            stroke(0, 255, 0);
            strokeWeight(2);
            beginShape();
            for (let i = 0; i < points.length; i++) {
                vertex(points[i].x, points[i].y);
            }
            endShape(CLOSE);


            for (let i = 0; i < points.length; i++) {
                stroke(255, 0, 0);
                strokeWeight(8);
                if (active_number == i) {
                    circle(points[i].x, points[i].y, 15);
                }
                else {
                    circle(points[i].x, points[i].y, 5);
                }
                noStroke();
                fill(255);
                text(i, points[i].x, points[i].y);
                fill(255, 0, 0, 51); // 透明度20%
            }



            tint(255, 160); // 半分の不透明度で表示
            const aspect = getAspectRatio();

            drawSlide(20, 20,
                defaults.camera.width * 0.25,
                defaults.camera.width * 0.25 * aspect);
            tint(255, 255);
            stroke(0, 255, 0);
            strokeWeight(2);
            rect(20, 20, width * .25, width * 0.25 * aspect);

            // 右上に "preview" の文字をいれる
            textSize(16);
            textAlign(RIGHT, TOP);
            fill(255);
            noStroke();
            text('preview', -5 + 20 + width * 0.25, 25);

            // video.time()の値を画面右上にタイムコードとして表示。背景は黒、文字色は白とする
            textSize(9);
            textAlign(LEFT, TOP);
            fill(255);
            noStroke();
            text(video.time().toFixed(2),
                -5 + 30, 25);

        } else {
            const aspect = getAspectRatio();
            drawSlide(0, 0, defaults.camera.width, defaults.camera.width * aspect);
            // image(video, 0, 0, width / 4, height / 4);
        }




    }


}


function drawSlide(x, y, w, h) {
    let srcPoints = [
        { x: points[0].x, y: points[0].y },
        { x: points[1].x, y: points[1].y },
        { x: points[2].x, y: points[2].y },
        { x: points[3].x, y: points[3].y }
    ];
    // points情報を localStorageに保存
    localStorage.setItem('slidecapture.points', JSON.stringify(srcPoints));
    let img = rectifyImage(video, srcPoints, 0, 0, video.width, video.height);

    image(img, x, y, w, h);
}

function cmousePressed(event) {
    // mouseX, mouseYはこのタイミングでは更新されていないため、eventのtouches情報を利用する。ただしこの場合はcanvasの座標系ではなく、domのサイズによる座標系になるため事前にその計算を行う必要がある
    if (!is_pc) {
        let dom = document.querySelector('#p5canvas');
        console.log(dom.clientWidth, dom.clientHeight);
        let max = {
            x: dom.clientWidth,
            y: dom.clientHeight
        }
        let rect = event.target.getBoundingClientRect();
        mouseX = width * (event.touches[0].clientX - rect.left) / max.x;
        mouseY = height * (event.touches[0].clientY - rect.top) / max.y;
    }

    // mouseX = event.touches[0].clientX;
    // mouseY = event.touches[0].clientY;
    for (let i = 0; i < points.length; i++) {
        if (dist(mouseX, mouseY, points[i].x, points[i].y) < 50) {
            draggingPoint = points[i];
            active_number = i;
            break;
        }
    }
    document.querySelector('#debug_text').innerHTML = `Pressed:(${mouseX}, ${mouseY})\n`;
}

function cmouseDragged() {

    if (draggingPoint) {
        draggingPoint.x = mouseX;
        draggingPoint.y = mouseY;
    }
    document.querySelector('#debug_text').innerHTML = `Dragged:(${mouseX}, ${mouseY})\n`;

}

function cmouseReleased() {
    draggingPoint = null;
    active_number = -1;
    document.querySelector('#debug_text').innerHTML = `Released:(${mouseX}, ${mouseY})\n`;
}

function keyPressed() {
    if (key === ' ') {
        toggleFullScreen()
    }
}

// ホモグラフィ変換で画像の歪みを補正する
function rectifyImage(srcImg, p, x, y, w, h) {
    let srcArr = [];
    p.forEach(p => {
        srcArr.push(p.x);
        srcArr.push(p.y);
    });

    // 生成画像のアスペクト比を決める
    // let w1 = Math.sqrt((p[0].x - p[1].x) ** 2 + (p[0].y - p[1].y) ** 2);
    // let h1 = Math.sqrt((p[1].x - p[2].x) ** 2 + (p[1].y - p[2].y) ** 2);
    // let w2 = Math.sqrt((p[2].x - p[3].x) ** 2 + (p[2].y - p[3].y) ** 2);
    // let h2 = Math.sqrt((p[3].x - p[0].x) ** 2 + (p[3].y - p[0].y) ** 2);
    // let maxWidth = Math.max(w1, w2);
    // let maxHeight = Math.max(h1, h2);
    let maxWidth = defaults.camera.width;
    let maxHeight = defaults.camera.height;

    let dstArr = [
        0, 0,
        maxWidth, 0,
        maxWidth, maxHeight,
        0, maxHeight
    ];

    const srcMat = cv.matFromArray(4, 1, cv.CV_32FC2, srcArr);
    const dstMat = cv.matFromArray(4, 1, cv.CV_32FC2, dstArr);
    const M = cv.getPerspectiveTransform(srcMat, dstMat);
    const src = cv.imread(srcImg.canvas);
    let dst = new cv.Mat();
    let dsize = new cv.Size(maxWidth, maxHeight);
    cv.warpPerspective(src, dst, M, dsize, cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar());


    let imgData = new ImageData(new Uint8ClampedArray(dst.data), dst.cols, dst.rows);
    transformedImage.clear();
    // transformedImage.resizeCanvas(imgData.width, imgData.height);
    transformedImage.drawingContext.putImageData(imgData, 0, 0);

    // transformedImage.width = imgData.width;
    // transformedImage.height = imgData.height;


    srcMat.delete();
    dstMat.delete();
    M.delete();
    src.delete();
    dst.delete();

    return transformedImage;
}

function createMatrixFromPoints(points) {
    let mat = new p5.Matrix();
    let n = points.length;
    let pts = [];

    for (let i = 0; i < n; i++) {
        pts.push(points[i].x);
        pts.push(points[i].y);
    }

    mat.set(pts);
    return mat;
}


function toggleShowBasicTutorial(dom) {
    // dom.checkedをlocalStorageに保存
    localStorage.setItem('slidecapture.showBasicTutorial', dom.checked);
}

function toggleFullScreen() {
    homographyMode = !homographyMode;

    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
    } else if (document.exitFullscreen) {
        document.exitFullscreen();
    }


    const aspect = getAspectRatio();
    if (homographyMode) {
        resizeCanvas(defaults.camera.width, defaults.camera.width * aspect);
    }
    else {
        resizeCanvas(defaults.camera.width, defaults.camera.height);
    }
    p5canvas.style('height', 'auto');
    p5canvas.style('width', '100%');

    // if (homographyMode) {
    //     document.querySelector('#control_ui').style.display = 'none';
    // }
    // else {
    //     document.querySelector('#control_ui').style.display = '';
    // }
}
