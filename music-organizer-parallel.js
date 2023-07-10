const fs = require('fs');
const path = require('path');
const util = require('util');
const sharp = require('sharp');
const { promisify } = require('util');
const robot = require('robotjs');
const PNG = require('pngjs').PNG;
const os = require('os');

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const copyFile = promisify(fs.copyFile);
const mkdir = promisify(fs.mkdir);

let isOrganizing = true; //Variable de control

async function main() {
  // Directorios de origen y destino
  const desktopDirectory = path.join(os.homedir(), 'Desktop');
  const documentsDirectory = path.join(os.homedir(), 'Documents');
  const destinationDirectory = path.join(os.homedir(), 'Downloads', 'Musica');

  // Obtener todos los archivos MP3 de los directorios de origen
  const mp3Files = [...await getMP3Files(desktopDirectory), ...await getMP3Files(documentsDirectory)];

  // Iniciar la captura de pantallas en paralelo
  const screenshotsPromise = captureScreenshotsAsync(5);

  
  // Crear directorio de destino si no existe
  await mkdir(destinationDirectory, { recursive: true });
  
  // Organizar los archivos de música
  await organizeMusic(mp3Files, destinationDirectory);
  
  // Cuando la organización de música haya finalizado, establece la variable de control en falso para detener la toma de capturas
  isOrganizing = false;

  // Esperar a que finalicen tanto la captura de pantallas como la organización de música
  await screenshotsPromise;

  console.log('Organización de música completada.');
}

// Obtener todos los archivos MP3 en el directorio especificado y sus subdirectorios
async function getMP3Files(directory) {
  const files = await readdir(directory);

  const mp3Files = [];
  for (const file of files) {
    const filePath = path.join(directory, file);
    const fileStat = await stat(filePath);
    if (fileStat.isFile() && path.extname(file) === '.mp3') {
      mp3Files.push(filePath);
    } else if (fileStat.isDirectory()) {
      const subdirectoryFiles = await getMP3Files(filePath);
      mp3Files.push(...subdirectoryFiles);
    }
  }

  return mp3Files;
}

async function organizeMusic(mp3Files, destinationDirectory) {
  // Utilizar promesas en paralelo para procesar los archivos de música
  await Promise.all(mp3Files.map(async (mp3File) => {
    try {
      // Importar el módulo music-metadata utilizando import()
      const { parseFile } = await import('music-metadata');

      // Leer la metadata del archivo MP3
      const metadata = await parseFile(mp3File);

      if (metadata.common) {
        // Obtener el año y el álbum del archivo
        const year = metadata.common.year ? metadata.common.year.toString() : '';
        const album = metadata.common.album || 'Unknown Album';

        // Crear directorios para el año y el álbum si no existen
        const yearDirectory = path.join(destinationDirectory, year);
        const albumDirectory = path.join(yearDirectory, album);
        await mkdir(yearDirectory, { recursive: true });
        await mkdir(albumDirectory, { recursive: true });

        // Copiar el archivo al directorio de destino
        const fileName = path.basename(mp3File);
        const destinationFilePath = path.join(albumDirectory, fileName);
        await copyFile(mp3File, destinationFilePath);
        console.log(`El archivo '${fileName}' ha sido organizado.`);
      }
    } catch (error) {
      // Manejar cualquier excepción que ocurra durante el procesamiento del archivo
      console.log(`Error al procesar el archivo '${mp3File}': ${error.message}`);
    }
  }));
}

async function captureScreenshotsAsync(interval) {
  let screenshotCount = 1;

  // while (isOrganizing) {
    try {
      // Tomar captura de pantalla
      const screenSize = robot.getScreenSize();
      const screenshotData = robot.screen.capture(0, 0, screenSize.width, screenSize.height);
      
      // Guardar la captura de pantalla en un archivo
      const screenshotPath = `screenshot_${screenshotCount}.png`;
      await saveScreenshot(screenshotData, screenshotPath);
      
      console.log(`Captura de pantalla ${screenshotCount} tomada y guardada.`);
      screenshotCount++;
    } catch (error) {
      console.error('Error al tomar la captura de pantalla:', error);
    }

    // Esperar el intervalo de tiempo antes de tomar la siguiente captura
    await wait(interval);
  // }
}

async function saveScreenshot(screenshotData, filePath) {
  // Directorio de destino (Descargas)
  const destinationDirectory = path.join(os.homedir(), 'Downloads', 'Screenshots');

  // Ruta completa del archivo de destino
  const destinationFilePath = path.join(destinationDirectory, filePath);

  try {
    // Se asegura de que el directorio exista
    await fs.promises.mkdir(destinationDirectory, { recursive: true });

    const { width, height, image } = screenshotData;

    // Crea un objeto PNG con el mismo width y height
    const png = new PNG({ width, height });

    // Copia la informacion de imagen del bitmap al objeto PNG
    const pixels = new Uint8Array(image.buffer);
    for (let i = 0; i < width * height * 4; i++) {
      png.data[i] = pixels[i];
    }

    // Guarda la imagen PNG al directorio de destino
    const stream = fs.createWriteStream(destinationFilePath);
    png.pack().pipe(stream);

    await new Promise((resolve, reject) => {
      stream.on('finish', resolve);
      stream.on('error', reject);
    });

    console.log(`Captura de pantalla guardada en: ${destinationFilePath}`);
  } catch (error) {
    console.error('Error al guardar la captura de pantalla:', error);
  }
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Uso del método
// captureScreenshotsAsync(5)
//   .catch((error) => console.error(error));


main()
  .catch((error) => console.error(error));
