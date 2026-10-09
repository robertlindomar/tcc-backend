const RAIO_TERRA_KM = 6371.0088;

function grausParaRadianos(valor: number): number {
    return (valor * Math.PI) / 180;
}

export function calcularDistanciaKm(
    origem: { latitude: number; longitude: number },
    destino: { latitude: number; longitude: number },
): number {
    const diferencaLatitude = grausParaRadianos(destino.latitude - origem.latitude);
    const diferencaLongitude = grausParaRadianos(destino.longitude - origem.longitude);
    const latitudeOrigem = grausParaRadianos(origem.latitude);
    const latitudeDestino = grausParaRadianos(destino.latitude);

    const haversine =
        Math.sin(diferencaLatitude / 2) ** 2 +
        Math.cos(latitudeOrigem) *
            Math.cos(latitudeDestino) *
            Math.sin(diferencaLongitude / 2) ** 2;

    return 2 * RAIO_TERRA_KM * Math.asin(Math.sqrt(haversine));
}
