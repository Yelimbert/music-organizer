using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using System.Drawing;
using System.Drawing.Imaging;
using System.Drawing.Common;
using TagLib;
using File = System.IO.File;

namespace MusicOrganizer
{
    class Program
    {
        static void Main(string[] args)
        {
            // Directorios de origen y destino
            string desktopDirectory = Environment.GetFolderPath(Environment.SpecialFolder.Desktop);
            string documentsDirectory = Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments);
            string destinationDirectory = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), "Downloads", "Music");

            // Obtener todos los archivos MP3 de los directorios de origen
            var mp3Files = GetMP3Files(desktopDirectory).Concat(GetMP3Files(documentsDirectory));

            // Crear directorio de destino si no existe
            Directory.CreateDirectory(destinationDirectory);

            // Organizar los archivos de música
            OrganizeMusic(mp3Files, destinationDirectory);
            
            Console.WriteLine("Organizacion de musica completada.");
            Console.Read();
        }

        // Obtener todos los archivos MP3 en el directorio especificado y sus subdirectorios
        static IEnumerable<string> GetMP3Files(string directory)
        {
            return Directory.EnumerateFiles(directory, "*.mp3", SearchOption.TopDirectoryOnly);
        }

        static void OrganizeMusic(IEnumerable<string> mp3Files, string destinationDirectory)
        {
            // Utilizar paralelismo para procesar los archivos de música
            Parallel.ForEach(mp3Files, mp3File =>
            {
                try
                {
                    // Leer la metadata del archivo MP3
                    var file = TagLib.File.Create(mp3File);
                    
                    if (file.Tag != null)
                    {
                        // Obtener el año y el álbum del archivo
                        string year = file.Tag.Year.ToString();
                        string album = file.Tag.Album ?? "Unknown Album";

                        // Crear directorios para el año y el álbum si no existen
                        string yearDirectory = Path.Combine(destinationDirectory, year);
                        string albumDirectory = Path.Combine(yearDirectory, album);
                        Directory.CreateDirectory(yearDirectory);
                        Directory.CreateDirectory(albumDirectory);

                        // Copiar el archivo al directorio de destino
                        string fileName = Path.GetFileName(mp3File);
                        string destinationFilePath = Path.Combine(albumDirectory, fileName);
                        File.Copy(mp3File, destinationFilePath, true);
                        Console.WriteLine($"El archivo '{fileName}' ha sido organizado.");
                    }
                }
                catch (Exception ex)
                {
                    // Manejar cualquier excepción que ocurra durante el procesamiento del archivo
                    Console.WriteLine($"Error al procesar el archivo '{mp3File}': {ex.Message}");
                }
            });
        }

        static Bitmap CaptureScreen()
        {
            //Crear un bitmap con el tamano de la pantalla
            Bitmap screenshot = new Bitmap(Screen);
        }
    }
}
