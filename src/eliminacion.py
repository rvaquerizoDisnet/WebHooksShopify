import os
from datetime import datetime, timedelta
import shutil
import time

def limpiar_carpeta(ruta_carpeta, dias_limite):
    fecha_limite = datetime.now() - timedelta(days=dias_limite)
    carpeta_procesados = os.path.join(ruta_carpeta, "Procesados")

    for root, dirs, files in os.walk(ruta_carpeta):
        for archivo in files:
            ruta_completa = os.path.join(root, archivo)
            fecha_modificacion = datetime.fromtimestamp(os.path.getmtime(ruta_completa))
            
            if ruta_carpeta in root and not root.startswith(carpeta_procesados):
                if fecha_modificacion < fecha_limite and archivo.endswith('.csv'):
                    destino = os.path.join(carpeta_procesados, archivo)
                    shutil.move(ruta_completa, destino)
                    print(f"Archivo movido a la carpeta 'Procesados': {ruta_completa}")

def calcular_proxima_ejecucion(hora_deseada):
    ahora = datetime.now()
    hora_programada = ahora.replace(hour=hora_deseada, minute=0, second=0, microsecond=0)
    if ahora > hora_programada:
        hora_programada += timedelta(days=1)
    tiempo_hasta_ejecucion = hora_programada - ahora
    return tiempo_hasta_ejecucion.total_seconds()

def main():
    rutas_carpetas = [r'L:\TTE\FITXERS\DHL\TRAKING', r'L:\CLIENTS FITXERS\24UOC\Export\GECO']  # Lista de rutas de carpetas a revisar
    dias_limite = 4 
    hora_deseada = 12
    
    while True:
        for ruta_carpeta in rutas_carpetas:
            tiempo_hasta_ejecucion = calcular_proxima_ejecucion(hora_deseada)
            print(f"Próxima ejecución en {tiempo_hasta_ejecucion / 3600} horas para la carpeta {ruta_carpeta}...")
            time.sleep(tiempo_hasta_ejecucion)
            limpiar_carpeta(ruta_carpeta, dias_limite)
            print("Limpieza completada para la carpeta", ruta_carpeta)

if __name__ == "__main__":
    main()
