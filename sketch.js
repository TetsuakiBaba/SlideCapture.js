let video;
let videoSourceSelect;
let points = [];
let draggingPoint = null;
let homographyMode = false;
let transformedImage;

function setup() {
    transformedImage = createGraphics(1280, 720);
    createCanvas(1280, 720);
    videoSourceSelect = select('#videoSource');
    videoSourceSelect.changed(initVideo);

    // デフォルトの4点をランダムにしないで設定
    points = [
        createVector(500, 100),
        createVector(1180, 100),
        createVector(1180, 620),
        createVector(500, 620)
    ];

    initVideo();
}

function initVideo() {
    if (video) {
        video.remove();
    }

    let constraints = {
        video: {
            deviceId: videoSourceSelect.value(),
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30 }
        }
    };

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
                point(points[i].x, points[i].y);
            }

            drawSlide(0, 0, width / 2, height / 2);
        } else {
            drawSlide(0, 0, width * 2, height * 2);
        }
    }
}

function drawSlide(x, y, w, h) {
    let srcPoints = [points[0].copy(), points[1].copy(), points[2].copy(), points[3].copy()];

    // スクリーンショットの画像を取得
    // let videoFrame = createGraphics(width, height);
    // videoFrame.image(video, 0, 0, video.width, video.height);
    // let img = videoFrame.get();

    // image(img, 300, 10, 100, 100);
    let img = rectifyImage(video.get(), srcPoints, 0, 0, video.width, video.height);
    image(img.get(), x, y, w, h);
}

function mousePressed() {
    for (let i = 0; i < points.length; i++) {
        if (dist(mouseX, mouseY, points[i].x, points[i].y) < 10) {
            draggingPoint = points[i];
            break;
        }
    }
}

function mouseDragged() {
    if (draggingPoint) {
        draggingPoint.x = mouseX;
        draggingPoint.y = mouseY;
    }
}

function mouseReleased() {
    draggingPoint = null;
}

function keyPressed() {
    if (key === ' ') {
        homographyMode = !homographyMode;
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
