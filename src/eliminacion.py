import os
from datetime import datetime, timedelta
import time

def limpiar_carpeta(ruta_carpeta, dias_limite):
    fecha_limite = datetime.now() - timedelta(days=dias_limite)
    for root, dirs, files in os.walk(ruta_carpeta):
        for archivo in files:
            ruta_completa = os.path.join(root, archivo)
            fecha_modificacion = datetime.fromtimestamp(os.path.getmtime(ruta_completa))
            if fecha_modificacion < fecha_limite:
                os.remove(ruta_completa)
                print(f"Archivo eliminado: {ruta_completa}")

def calcular_proxima_ejecucion(hora_deseada):
    ahora = datetime.now()
    hora_programada = ahora.replace(hour=hora_deseada, minute=0, second=0, microsecond=0)
    if ahora > hora_programada:
        # Si ya pasó la hora programada para hoy, programar para mañana
        hora_programada += timedelta(days=1)
    tiempo_hasta_ejecucion = hora_programada - ahora
    return tiempo_hasta_ejecucion.total_seconds()

def main():
    ruta_carpeta = r'C:\ruta\a\tu\carpeta'
    dias_limite = 30 # Cambia esto según tus necesidades
    hora_deseada = 2  # Cambia esta hora según la que desees (en formato de 24 horas)
    
    while True:
        tiempo_hasta_ejecucion = calcular_proxima_ejecucion(hora_deseada)
        print(f"Próxima ejecución en {tiempo_hasta_ejecucion / 3600} horas...")
        time.sleep(tiempo_hasta_ejecucion)
        limpiar_carpeta(ruta_carpeta, dias_limite)
        print("Limpieza completada.")

if __name__ == "__main__":
    main()

#c