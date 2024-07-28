let video;
let videoSourceSelect;
let points = [];
let draggingPoint = null;
let homographyMode = false;
let transformedImage;
let active_number = -1;

function setup() {
    transformedImage = createGraphics(1280, 720);

    let c = createCanvas(1280, 720);
    c.parent('p5canvas');
    // cを縦横比を固定して横幅100%表示にする
    c.style('height', 'auto');
    c.style('width', '100%');

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
    } else if (navigator.userAgent.indexOf('iPad') > 0 ||
        navigator.userAgent.indexOf('Android') > 0) {
        //タブレット用の処理
        c.touchStarted(cmousePressed);
        c.touchMoved(cmouseDragged);
        c.touchEnded(cmouseReleased);
        disable_scroll();
    } else if (navigator.userAgent.indexOf('Safari') > 0 &&
        navigator.userAgent.indexOf('Chrome') == -1 &&
        typeof document.ontouchstart !== 'undefined') {
        //iOS13以降のiPad用の処理
        c.touchStarted(cmousePressed);
        c.touchMoved(cmouseDragged);
        c.touchEnded(cmouseReleased);
        disable_scroll();
    } else {
        c.mousePressed(cmousePressed);
        c.mouseMoved(cmouseDragged);
        c.mouseReleased(cmouseReleased);
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
    console.log(points);

    initVideo();

    // fullscreenchangeイベントを監視
    document.addEventListener('fullscreenchange', (event) => {
        if (!document.fullscreenElement) {
            homographyMode = false;
            document.querySelector('#control_ui').style.display = '';
        }
    });
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
            facingMode: "environment",
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30 }
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

    // videoに新しいフレームがある場合
    if (video.loadedmetadata) {

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

            stroke(255, 0, 0);
            strokeWeight(8);
            for (let i = 0; i < points.length; i++) {
                if (active_number == i) {
                    circle(points[i].x, points[i].y, 15);
                }
                else {
                    circle(points[i].x, points[i].y, 5);
                }
            }
            tint(255, 200); // 半分の不透明度で表示
            drawSlide(20, 20, width * 0.25, height * 0.25);
            tint(255, 255);
            stroke(0, 255, 0);
            strokeWeight(2);
            rect(20, 20, width * .25, height * .25);
            // 右上に "preview" の文字をいれる
            fill(255);
            noStroke();
            textSize(16);
            textAlign(RIGHT, TOP);
            text('preview', -5 + 20 + width * 0.25, 25);

        } else {
            drawSlide(0, 0, width, height);
        }
    }
}

function drawSlide(x, y, w, h) {
    let srcPoints = [
        { x: points[0].x, y: points[0].y },
        { x: points[1].x, y: points[1].y },
        { x: points[2].x, y: points[2].y },
        { x: points[3].x, y: points[3].y }];
    // points情報を localStorageに保存
    localStorage.setItem('slidecapture.points', JSON.stringify(srcPoints));
    let img = rectifyImage(video.get(), srcPoints, 0, 0, video.width, video.height);
    image(img.get(), x, y, w * 2, h * 2);
}

function cmousePressed() {
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
    let w1 = Math.sqrt((p[0].x - p[1].x) ** 2 + (p[0].y - p[1].y) ** 2);
    let h1 = Math.sqrt((p[1].x - p[2].x) ** 2 + (p[1].y - p[2].y) ** 2);
    let w2 = Math.sqrt((p[2].x - p[3].x) ** 2 + (p[2].y - p[3].y) ** 2);
    let h2 = Math.sqrt((p[3].x - p[0].x) ** 2 + (p[3].y - p[0].y) ** 2);
    let maxWidth = Math.max(w1, w2);
    let maxHeight = Math.max(h1, h2);

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
    transformedImage.drawingContext.putImageData(imgData, 0, 0);
    transformedImage.width = imgData.width;
    transformedImage.height = imgData.height;


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



function toggleFullScreen() {
    homographyMode = !homographyMode;
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
    } else if (document.exitFullscreen) {
        document.exitFullscreen();
    }

    if (homographyMode) {
        document.querySelector('#control_ui').style.display = 'none';
    }
    else {
        document.querySelector('#control_ui').style.display = '';
    }
}
