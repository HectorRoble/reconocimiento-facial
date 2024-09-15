// Selecciona el elemento de video del HTML
const video = document.getElementById('video');

// Cargar los modelos necesarios de face-api.js
Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
    faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
    faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
    faceapi.nets.faceExpressionNet.loadFromUri('/models')
]).then(startVideo);

// Función para iniciar el video desde la cámara
function startVideo() {
    // Solicita acceso a la cámara del dispositivo
    navigator.mediaDevices.getUserMedia({ video: {} })
        .then(stream => {
            // Asigna el flujo de video al elemento de video en el HTML
            video.srcObject = stream;
        })
        .catch(err => console.error("Error al acceder a la cámara: ", err));
}

// Evento que se activa cuando el video comienza a reproducirse
video.addEventListener('play', () => {
    // Crea un canvas a partir del video
    const canvas = faceapi.createCanvasFromMedia(video);
    document.body.append(canvas);
    const displaySize = { width: video.width, height: video.height };
    faceapi.matchDimensions(canvas, displaySize);

    // Cargar imágenes de referencia y crear un FaceMatcher
    loadLabeledImages().then(labeledFaceDescriptors => {
        const faceMatcher = new faceapi.FaceMatcher(labeledFaceDescriptors, 0.6);

        // Configura un intervalo para detectar rostros continuamente
        setInterval(async () => {
            // Detecta todos los rostros en el video con sus puntos de referencia y descriptores
            const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceDescriptors();
            const resizedDetections = faceapi.resizeResults(detections, displaySize);
            canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
            faceapi.draw.drawDetections(canvas, resizedDetections);
            faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);

            // Compara los descriptores detectados con los descriptores de referencia
            const results = resizedDetections.map(d => faceMatcher.findBestMatch(d.descriptor));
            results.forEach((result, i) => {
                const box = resizedDetections[i].detection.box;
                const drawBox = new faceapi.draw.DrawBox(box, { label: result.toString() });
                drawBox.draw(canvas);
            });
        }, 100);
    });
});

// Función para cargar imágenes de referencia y obtener sus descriptores faciales
async function loadLabeledImages() {
    const labels = ['hector', 'giuliana']; // Nombres de las personas
    return Promise.all(
        labels.map(async label => {
            const descriptions = [];
            for (let i = 1; i <= 1; i++) { // Asume que tienes 3 imágenes por persona
                const img = await faceapi.fetchImage(`/images/${label}/${i}.png`);
                const detections = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();
                descriptions.push(detections.descriptor);
            }
            return new faceapi.LabeledFaceDescriptors(label, descriptions);
        })
    );
}
