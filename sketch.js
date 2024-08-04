let video;
let videoSourceSelect;
let previousFrame;
let points = [];
let pip_points = [];
let pip_bb;
let draggingPoint = null;
let homographyMode = false;
let transformedImage;
let active_number = -1;
let is_pc = true;
let device_name = 'PC';
let p5canvas;
let is_debug = false;


let defaults = {
    camera: {
        width: 1280,
        height: 720,
        fps: 24
    }
}

let is_show_text = false;
let is_black_screen = false;
let is_show_preview = true;
let pinp_scale = 1.0;
let text_message = '';

let fullscreen_mode = 'SCREEN';// SCREEN, CAMERA, SCREEN_CAMERA
// プレビューの位置を変更する
// LEFT_TOP, RIGHT_TOP, RIGHT_BOTTOM, LEFT_BOTTOM
// デフォルトはLEFT_TOP
// デフォルトの位置から時計回りに変更する
let display_mode = 'DEFAULT';
let preview_position = 'LEFT_TOP';
function movePreviewPosition() {
    if (display_mode == 'DEFAULT') {
        if (preview_position == 'LEFT_TOP') {
            preview_position = 'RIGHT_TOP';
        }
        else if (preview_position == 'RIGHT_TOP') {
            preview_position = 'RIGHT_BOTTOM';
        }
        else if (preview_position == 'RIGHT_BOTTOM') {
            preview_position = 'LEFT_BOTTOM';
        }
        else {
            preview_position = 'LEFT_TOP';
        }
    }
}


function setup() {
    pixelDensity(1.0);
    transformedImage = createGraphics(defaults.camera.width, defaults.camera.height);
    let c = p5canvas = createCanvas(defaults.camera.width, defaults.camera.height, P2D);

    frameRate(defaults.camera.fps);
    c.parent('p5canvas');
    // cを縦横比を固定して横幅100%表示にする
    c.style('height', 'auto');
    c.style('width', '100%');
    c.doubleClicked(toggleFullScreen);

    document.querySelector('#client_type').innerHTML = `${navigator.userAgent}\n`;
    if (navigator.userAgent.indexOf('Android') > 0 &&
        navigator.userAgent.indexOf('Mobile') > 0) {
        //スマホ用の処理
        c.touchStarted(cmousePressed);
        c.touchMoved(cmouseDragged);
        c.touchEnded(cmouseReleased);
        device_name = 'Android';
        is_pc = false;
    }
    else if (navigator.userAgent.indexOf('iPhone') > 0 ||
        navigator.userAgent.indexOf('iPod') > 0) {
        alert('iPhoneではフルスクリーンAPIの制約により正しく動作しません。iPadやAndroid等をご利用ください。iPhone is not supported due to the limitation of the Fullscreen API, please use iPad or Android.');
        is_pc = false;
    }
    else if (navigator.userAgent.indexOf('iPad') > 0) {
        //タブレット用の処理
        c.touchStarted(cmousePressed);
        c.touchMoved(cmouseDragged);
        c.touchEnded(cmouseReleased);
        device_name = 'iPad';
        is_pc = false;
    } else if (navigator.userAgent.indexOf('Android') > 0) {
        //タブレット用の処理
        c.touchStarted(cmousePressed);
        c.touchMoved(cmouseDragged);
        c.touchEnded(cmouseReleased);
        device_name = 'Android';
        is_pc = false;
    }
    else if (navigator.userAgent.indexOf('Safari') > 0 &&
        navigator.userAgent.indexOf('Chrome') == -1 &&
        typeof document.ontouchstart !== 'undefined') {
        //iOS13以降のiPad用の処理
        c.touchStarted(cmousePressed);
        c.touchMoved(cmouseDragged);
        c.touchEnded(cmouseReleased);
        device_name = 'iPad';
        is_pc = false;
    } else {
        c.mousePressed(cmousePressed);
        c.mouseMoved(cmouseDragged);
        c.mouseReleased(cmouseReleased);
        device_name = 'PC';
        is_pc = true;
    }

    if (!is_pc) {
        document.querySelector('#button_open_fullscreen_ui_window').style.display = 'none';
    }
    document.querySelector('#device_name').value = device_name;

    videoSourceSelect = select('#videoSource');
    videoSourceSelect.changed(initVideo);


    resetCornerPoints();
    // もしlocalStorageにpoints情報があればそれを使う
    let savedPoints = localStorage.getItem('slidecapture.points');
    if (savedPoints) {
        points = JSON.parse(savedPoints);
    }
    // もし取得したpointsがcanvasサイズからはみでていれば初期値に戻す
    for (let i = 0; i < points.length; i++) {
        if (points[i].x < 0 || points[i].x > width || points[i].y < 0 || points[i].y > height) {
            resetCornerPoints();
            break;
        }
    }

    initVideo();


    // fullscreenchangeイベントを監視
    document.addEventListener('fullscreenchange', (event) => {
        if (!document.fullscreenElement) {
            homographyMode = false;
            display_mode = 'DEFAULT';
            document.querySelector('#control_ui').style.display = '';
        }
        resetPosition();
    });
}

function resetCornerPoints() {
    // デフォルトの4点をランダムにしないで設定
    points = [
        { x: defaults.camera.width / 2 - 200, y: defaults.camera.height / 2 - 200 },
        { x: defaults.camera.width / 2 + 200, y: defaults.camera.height / 2 - 200 },
        { x: defaults.camera.width / 2 + 200, y: defaults.camera.height / 2 + 200 },
        { x: defaults.camera.width / 2 - 200, y: defaults.camera.height / 2 + 200 }
    ];
}

function getAspectRatio() {
    let aspect;
    let display = { w: window.screen.width, h: window.screen.height };
    if (device_name === 'iPad') {
        display = { w: window.screen.height, h: window.screen.height };
    }
    if (document.querySelector('#aspect').value == "fit") {
        if (display.w > display.h) {
            aspect = parseFloat(display.h / display.w);
        }
        else {
            aspect = parseFloat(display.w / display.h)
        }
    }
    else {
        aspect = parseFloat(document.querySelector('#aspect').value);
    }

    return aspect;
}

function getDisplayAspectRatio() {
    let aspect = parseFloat(window.screen.height / window.screen.width);
    if (aspect > 1.0) {
        aspect = parseFloat(window.screen.width / window.screen.height);
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
    const resolution = document.querySelector('#select_camera_resolution').value.split('x');
    camera_width = parseInt(resolution[0]);
    camera_height = parseInt(resolution[1]);
    defaults.camera.width = camera_width;
    defaults.camera.height = camera_height;

    resizeCanvas(defaults.camera.width, defaults.camera.height);
    transformedImage.resizeCanvas(defaults.camera.width, defaults.camera.height);
    p5canvas.style('width', '100%');
    p5canvas.style('height', 'auto');
    let constraints = {
        video: {
            deviceId: videoSourceSelect.value(),
            // facingMode: { ideal: "environment" },
            width: { ideal: defaults.camera.width },
            height: { ideal: defaults.camera.height },
            frameRate: { ideal: defaults.camera.fps }
        },
        audio: false
    };

    // deviceidをlocalStorageに保存
    localStorage.setItem('slidecapture.deviceId', videoSourceSelect.value());

    video = createCapture(constraints, (stream) => {
        video.hide();
        let videoTrack = stream.getVideoTracks()[0];
        let settings = videoTrack.getSettings();
        let capabilities = stream.getVideoTracks()[0].getCapabilities();
        // ズーム機能を表示したいときには下のコメントを外してデバッグする
        // capabilities.zoom = { min: 1, max: 10, step: 0.1 };
        // settings.zoom = 5;
        if (capabilities.zoom) {
            if (!capabilities.zoom.step) {
                capabilities.zoom.step = 0.1;
            }
            document.getElementById('zoom_ui').innerHTML = `
            <div class="row mt-2 mb-2">
                <div class="col-2 text-end fs-4">
                    <i class="bi bi-zoom-out"></i>
                </div>  
                <div class="col-8 text-center">
                    <input type="range" class="form-range" min="${capabilities.zoom.min}" max="${capabilities.zoom.max}" value="${settings.zoom}" step="${capabilities.zoom.step}" id="zoom_ui_input">
                </div>
                <div class="col-2 text-start fs-4">
                    <i class="bi bi-zoom-in"></i>
                </div>
            </div>
            `;
            document.getElementById('zoom_ui_input').addEventListener('input', (event) => {
                videoTrack.applyConstraints({ advanced: [{ zoom: parseFloat(event.target.value) }] });
            });
        }
    });

    // もしvideoにzoomがあれば、zoomの調整が可能なrange inputを設定する
    // const capabilities = video.getVideoTracks()[0].getCapabilities();
}

function draw() {
    // background(127);
    rectMode(CORNER);
    fill(0);
    noStroke();
    rect(0, 0, width, height);

    // videoが読み込まれていれば
    if (video.loadedmetadata) {
        video.loadPixels();
        if (display_mode == 'DEFAULT') {
            image(video, 0, 0, width, height);

            // 矩形領域の塗りつぶしを透明度20%に設定
            fill(255, 0, 0, 51); // 透明度20%
            textSize(16);
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

            tint(255, 255); // 半分の不透明度で表示
            const aspect = getAspectRatio();

            if (is_show_preview) {
                let preview_pos = {
                    x: 20,
                    y: 20,
                    w: defaults.camera.width * .25,
                    h: defaults.camera.width * 0.25 * aspect
                };

                let scale = 0.35;

                if (preview_position == 'LEFT_TOP') {
                    preview_pos = {
                        x: 20, y: 20,
                        w: defaults.camera.width * scale, h: defaults.camera.width * scale * aspect
                    };
                }
                else if (preview_position == 'RIGHT_TOP') {
                    preview_pos = { x: width - 20 - defaults.camera.width * scale, y: 20, w: defaults.camera.width * scale, h: defaults.camera.width * scale * aspect };
                }
                else if (preview_position == 'RIGHT_BOTTOM') {
                    preview_pos = { x: width - 20 - defaults.camera.width * scale, y: height - 20 - defaults.camera.width * scale * aspect, w: defaults.camera.width * scale, h: defaults.camera.width * scale * aspect };
                }
                else {
                    preview_pos = { x: 20, y: height - 20 - defaults.camera.width * scale * aspect, w: defaults.camera.width * scale, h: defaults.camera.width * scale * aspect };
                }

                if (is_black_screen) {
                    fill(0);
                    rect(preview_pos.x, preview_pos.y, preview_pos.w, preview_pos.h);
                }
                else {
                    drawSlide(preview_pos.x, preview_pos.y, preview_pos.w, preview_pos.h);
                }

                tint(255, 255);
                stroke(0, 255, 0);
                strokeWeight(2);
                rectMode(CORNER);
                rect(preview_pos.x, preview_pos.y, preview_pos.w, preview_pos.h);

                // 右上に "preview" の文字をいれる
                textSize(preview_pos.w / 20);
                textAlign(RIGHT, TOP);
                fill(255);
                noStroke();
                text('preview', preview_pos.x + preview_pos.w - 5, preview_pos.y + 5);

                if (is_show_text) {
                    drawControllerMessage(
                        text_message,
                        preview_pos.x + preview_pos.w / 2,
                        preview_pos.y + preview_pos.h / 2,
                        preview_pos.w / 25
                    );
                }
            }

            // pip_pointsの描画
            rectMode(CORNER);
            if (pip_points.length > 0) {
                stroke(0, 0, 255);
                strokeWeight(2);
                noFill();
                // pip_pointsの最初と最後の座標を取得
                let x = pip_points[0].x;
                let y = pip_points[0].y;
                let w = pip_points[pip_points.length - 1].x - pip_points[0].x;
                let h = pip_points[pip_points.length - 1].y - pip_points[0].y;
                rect(x, y, w, h);
            }
            if (pip_bb) {
                stroke(0, 0, 255);
                strokeWeight(2);
                // pip_bb にマウスポインタがある場合
                if (mouseX > pip_bb.x && mouseX < pip_bb.x + pip_bb.w && mouseY > pip_bb.y && mouseY < pip_bb.y + pip_bb.h) {
                    fill(0, 0, 255, 51);
                    rect(pip_bb.x, pip_bb.y, pip_bb.w, pip_bb.h);
                    textAlign(CENTER, CENTER);
                    textSize(pip_bb.w / 10);
                    fill(255);
                    noStroke();
                    text('click to remove', pip_bb.x + pip_bb.w / 2, pip_bb.y + pip_bb.h / 2);
                }
                else {
                    fill(255, 0, 0, 51);
                    rect(pip_bb.x, pip_bb.y, pip_bb.w, pip_bb.h);
                }

                // fontSize(pip_bb.w / 25);
                fill(255);
                textSize(pip_bb.w / 10);
                textAlign(RIGHT, TOP);
                text('PinP', pip_bb.x + pip_bb.w, pip_bb.y);

            }

        }
        else if (display_mode == 'FULLSCREEN') {
            const aspect = getAspectRatio();
            // カメラサイズのアスペクト比を維持して表示。上下中央表示
            let y = 0;

            if (is_black_screen) {
                fill(0);
                rect(0, 0, width, height);
            }
            else if (fullscreen_mode == 'SCREEN') {
                if (height > defaults.camera.height) {
                    y = (height - defaults.camera.width * aspect) / 2;
                }
                drawSlide(
                    0, y,
                    defaults.camera.width, defaults.camera.width * aspect);
            }
            else if (fullscreen_mode == 'CAMERA') {
                if (height > defaults.camera.height) {
                    y = (height - defaults.camera.height) / 2;
                }
                image(video,
                    0,
                    y,
                    defaults.camera.width,
                    defaults.camera.height);

            }
            else if (fullscreen_mode == 'SCREEN_CAMERA') {
                if (height > defaults.camera.height) {
                    y = (height - defaults.camera.width * aspect) / 2;
                }
                drawSlide(
                    0, y,
                    defaults.camera.width, defaults.camera.width * aspect);
                if (pip_bb) {
                    // バウンディングボックスの座標の画像を bb_image に保存する
                    let bb_image = video.get(pip_bb.x, pip_bb.y, pip_bb.w, pip_bb.h);

                    // バウンディングボックスの画像を右下に表示
                    image(
                        bb_image,
                        defaults.camera.width - bb_image.width * pinp_scale - 25,
                        height - bb_image.height * pinp_scale - 25,
                        bb_image.width * pinp_scale,
                        bb_image.height * pinp_scale
                    );

                    // image(bb_image, defaults.camera.width - defaults.camera.width / 4 - 25,
                    //     defaults.camera.width * aspect - defaults.camera.width * aspect / 4 - 25,
                    //     defaults.camera.width / 4, defaults.camera.width * aspect / 4);
                }
                else {
                    image(video,
                        defaults.camera.width - pinp_scale * defaults.camera.width / 4 - 25,
                        height - pinp_scale * defaults.camera.height / 4 - 25,
                        pinp_scale * defaults.camera.width / 4,
                        pinp_scale * defaults.camera.height / 4);
                }
            }
            if (is_show_text) {
                drawControllerMessage(text_message, width / 2, height / 2, width / 25);
            }
        }
    }

    if (is_debug) {
        drawDebugInfo();
    }
}

function drawDebugInfo() {
    fill(0, 127);
    rect(0, 0, width, height);
    textSize(width / 100);
    noStroke();
    fill(255);
    let debug_text = `fps:${frameRate().toFixed(2)}\n`;
    debug_text += `device:${device_name}\n`;
    debug_text += `display_mode:${display_mode}\n`;
    debug_text += `fullscreen_mode:${fullscreen_mode}\n`;
    debug_text += `preview_position:${preview_position}\n`;
    debug_text += `is_show_text:${is_show_text}\n`;
    debug_text += `is_black_screen:${is_black_screen}\n`;
    debug_text += `is_show_preview:${is_show_preview}\n`;
    debug_text += `pinp_scale:${pinp_scale}\n`;
    debug_text += `text_message:${text_message}\n`;
    debug_text += `screen.window.width:${window.screen.width}, screen.window.height:${window.screen.height} \n`;
    debug_text += `width:${width}, height:${height}\n`;
    debug_text += `defaults.camera.width:${defaults.camera.width}, defaults.camera.height:${defaults.camera.height}\n`;
    // document.querySelector('#debug_text').innerHTML = debug_text;
    textAlign(LEFT, TOP);
    text(debug_text, 10, 100);
}

function drawControllerMessage(t, x, y, fs) {
    rectMode(CENTER);
    textSize(fs);
    fill(0, 200);
    rect(x, y, textWidth(text_message), fs);

    textAlign(CENTER, CENTER);
    fill(255);
    noStroke();
    text(t, x, y);
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
    performance.mark('start');
    let img = rectifyImage(video, srcPoints, 0, 0, video.width, video.height);
    performance.mark('end');
    performance.measure('rectifyImage', 'start', 'end');
    image(img, x, y, w, h);
}

function cmousePressed(event) {
    // mouseX, mouseYはこのタイミングでは更新されていないため、eventのtouches情報を利用する。ただしこの場合はcanvasの座標系ではなく、domのサイズによる座標系になるため事前にその計算を行う必要がある
    if (!is_pc) {
        disable_scroll();
        let dom = document.querySelector('#p5canvas');
        let max = {
            x: dom.clientWidth,
            y: dom.clientHeight
        }
        let rect = event.target.getBoundingClientRect();
        mouseX = width * (event.touches[0].clientX - rect.left) / max.x;
        mouseY = height * (event.touches[0].clientY - rect.top) / max.y;
    }

    for (let i = 0; i < points.length; i++) {
        if (dist(mouseX, mouseY, points[i].x, points[i].y) < 50) {
            draggingPoint = points[i];
            active_number = i;
            break;
        }
    }

    // ホモグラフィー変換用の座標をクリックしなかったときは、PinP用のバウンディングボックス処理を行う
    if (active_number <= 0 && display_mode != 'FULLSCREEN') {
        // クリック箇所が pip_bb の範囲内であれば pip_bb は null にする
        if (pip_bb && mouseX > pip_bb.x && mouseX < pip_bb.x + pip_bb.w && mouseY > pip_bb.y && mouseY < pip_bb.y + pip_bb.h) {
            pip_bb = null;
        }

        pip_points.push({ x: mouseX, y: mouseY });
    }
    document.querySelector('#debug_text').innerHTML = `Pressed:(${mouseX}, ${mouseY})\n`;
}

function cmouseDragged() {

    if (draggingPoint) {
        draggingPoint.x = mouseX;
        draggingPoint.y = mouseY;
    }

    if (pip_points.length > 0 && pip_bb == null) {
        pip_points.push({ x: mouseX, y: mouseY });
    }
    document.querySelector('#debug_text').innerHTML = `Dragged:(${mouseX}, ${mouseY})\n`;

}

function cmouseReleased() {
    draggingPoint = null;
    active_number = -1;

    if (!is_pc) {
        enable_scroll();
    }
    pip_points.push({ x: mouseX, y: mouseY });
    // バウンディングボックスの座標を計算
    if (pip_points.length > 1 && pip_bb == null) {
        let x = pip_points[0].x;
        let y = pip_points[0].y;
        let w = pip_points[pip_points.length - 1].x - pip_points[0].x;
        let h = pip_points[pip_points.length - 1].y - pip_points[0].y;
        // バウンディングボックスの座標を計算
        if (w < 5 || h < 5) {
            pip_bb = null;
        }
        else {
            pip_bb = { x: x, y: y, w: w, h: h };
        }

    }
    else {

    }
    pip_points = [];
    document.querySelector('#debug_text').innerHTML = `Released:(${mouseX}, ${mouseY})\n`;
}

function keyPressed() {
    if (key === ' ') {
        toggleFullScreen()
    }
    // 右矢印期間で画面表示をカメラ全体に変更
    if (key === 'c') {
        fullscreen_mode = 'CAMERA';// SCREEN, CAMERA, SCREEN_CAMERA
    }
    else if (key == 's') {
        fullscreen_mode = 'SCREEN';
    }
    else if (key == 'b') {
        fullscreen_mode = 'SCREEN_CAMERA';
    }
    else if (key == 'd') {
        is_debug = !is_debug;
    }

}

// ホモグラフィ変換で画像の歪みを補正する
// function rectifyImage(srcImg, p, x, y, w, h) {
//     let srcArr = [];
//     p.forEach(p => {
//         srcArr.push(p.x);
//         srcArr.push(p.y);
//     });

//     let maxWidth = defaults.camera.width;
//     let maxHeight = defaults.camera.height;

//     let dstArr = [
//         0, 0,
//         maxWidth, 0,
//         maxWidth, maxHeight,
//         0, maxHeight
//     ];

//     const srcMat = cv.matFromArray(4, 1, cv.CV_32FC2, srcArr);
//     const dstMat = cv.matFromArray(4, 1, cv.CV_32FC2, dstArr);
//     const M = cv.getPerspectiveTransform(srcMat, dstMat);
//     const src = cv.imread(srcImg.canvas);
//     let dst = new cv.Mat();
//     let dsize = new cv.Size(maxWidth, maxHeight);
//     cv.warpPerspective(src, dst, M, dsize, cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar());


//     let imgData = new ImageData(new Uint8ClampedArray(dst.data), dst.cols, dst.rows);
//     transformedImage.clear();
//     transformedImage.drawingContext.putImageData(imgData, 0, 0);

//     srcMat.delete();
//     dstMat.delete();
//     M.delete();
//     src.delete();
//     dst.delete();

//     return transformedImage;
// }



function rectifyImage(srcImg, points, x, y, w, h) {
    const srcArr = points.flatMap(p => [p.x, p.y]);

    const { width: maxWidth, height: maxHeight } = defaults.camera;

    const dstArr = [
        0, 0,
        maxWidth, 0,
        maxWidth, maxHeight,
        0, maxHeight
    ];

    const srcMat = cv.matFromArray(4, 1, cv.CV_32FC2, srcArr);
    const dstMat = cv.matFromArray(4, 1, cv.CV_32FC2, dstArr);
    const M = cv.getPerspectiveTransform(srcMat, dstMat);

    const src = cv.imread(srcImg.canvas);

    const dst = new cv.Mat();
    const dsize = new cv.Size(maxWidth, maxHeight);

    cv.warpPerspective(src, dst, M, dsize,
        cv.INTER_LINEAR,
        cv.BORDER_CONSTANT,
        new cv.Scalar());

    transformedImage.clear();
    const imgData = new ImageData(new Uint8ClampedArray(dst.data), dst.cols, dst.rows);
    transformedImage.drawingContext.putImageData(imgData, 0, 0);

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
    toggleShowScrollbar();
    if (display_mode != 'FULLSCREEN') {
        display_mode = 'FULLSCREEN';
    }
    else {
        display_mode = 'DEFAULT';
    }

    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
    } else if (document.exitFullscreen) {
        document.exitFullscreen();
    }

    resetPosition();
}

function resetPosition() {
    const aspect = getDisplayAspectRatio();
    if (display_mode == 'FULLSCREEN') {
        resizeCanvas(defaults.camera.width, defaults.camera.width * aspect);
    }
    else {
        resizeCanvas(defaults.camera.width, defaults.camera.height);
    }
    p5canvas.style('width', '100%');
    p5canvas.style('height', 'auto');



    if (display_mode == 'FULLSCREEN') {
        document.querySelector('#control_ui').style.display = 'none';
        // #canvasholder の classを col-8からcol-12に変更
        document.querySelector('#canvasholder').classList.remove('col-xs-12', 'col-sm-8');
        document.querySelector('#canvasholder').classList.add('col-12');
        document.querySelector('#canvasholder').insertBefore(document.querySelector('#p5canvas'), document.querySelector('#canvasholder').firstChild);
        document.querySelector('#canvasholder').style.cssText = 'margin:0px;padding:0px;';
    }
    else {
        document.querySelector('#control_ui').style.display = '';
        document.querySelector('#canvasholder').classList.remove('col-12');
        document.querySelector('#canvasholder').classList.add('col-xs-12', 'col-sm-8');
        document.querySelector('#canvasholder_settings').insertBefore(document.querySelector('#p5canvas'),
            document.querySelector('#canvasholder_settings').firstChild);
        document.querySelector('#canvasholder').style.cssText = '';
    }
}


const channel = new BroadcastChannel('slidecapture');
channel.onmessage = function (event) {
    if (event.data.type == 'fullscreen') {
        if (display_mode != 'FULLSCREEN') {
            channel.postMessage({
                type: 'Error',
                message: 'Please make the main window fullscreen first.',
                value: false
            });
        }
        else {
            if (event.data.value == 'screen') {
                channel.postMessage(
                    {
                        type: 'Success',
                        message: 'fullscreen_screen',
                        value: true
                    }
                )
                fullscreen_mode = 'SCREEN';
            }
            else if (event.data.value == 'camera') {
                channel.postMessage(
                    {
                        type: 'Success',
                        message: 'fullscreen_camera',
                        value: true
                    }
                );
                fullscreen_mode = 'CAMERA';
            }
            else if (event.data.value == 'pinp') {
                channel.postMessage(
                    {
                        type: 'Success',
                        message: 'fullscreen_pinp',
                        value: true
                    }
                );
                fullscreen_mode = 'SCREEN_CAMERA';
            }

        }
    }
    else if (event.data.type == 'show_text') {
        is_show_text = event.data.value;
    }
    else if (event.data.type == 'text_message') {
        text_message = event.data.text;
    }
    else if (event.data.type == 'toggle_black_screen') {
        is_black_screen = !is_black_screen;
        if (is_black_screen) {
            channel.postMessage({
                type: 'Success',
                message: 'toggle_black_screen',
                value: true
            });
        }
        else {
            channel.postMessage({
                type: 'Success',
                message: 'toggle_black_screen',
                value: false
            });
        }

    }
    else if (event.data.type == 'pinp_scale') {
        pinp_scale = event.data.value;
    }
};

function toggleShowScrollbar() {
    // html, bodyに overflow:hiddenを設定する
    if (document.querySelector('html').style.overflow == 'hidden' ||
        document.querySelector('body').style.overflow == 'hidden') {
        document.querySelector('html').style.overflow = '';
        document.querySelector('body').style.overflow = '';
    }
    else {
        document.querySelector('html').style.overflow = 'hidden';
        document.querySelector('body').style.overflow = 'hidden';
    }

}