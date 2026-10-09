import { ErroAplicacao } from "../../../shared/erros/ErroAplicacao";

type CoordenadasEndereco = {
    latitude: number | null;
    longitude: number | null;
};

function paraNumeroOuNull(valor: unknown): number | null {
    if (
        valor === undefined ||
        valor === null ||
        (typeof valor === "string" && valor.trim() === "")
    ) {
        return null;
    }
    return typeof valor === "number" ? valor : Number(valor);
}

export function validarCoordenadasEndereco(
    latitudeInformada: unknown,
    longitudeInformada: unknown,
): CoordenadasEndereco {
    const latitude = paraNumeroOuNull(latitudeInformada);
    const longitude = paraNumeroOuNull(longitudeInformada);

    if ((latitude === null) !== (longitude === null)) {
        throw new ErroAplicacao("Latitude e longitude devem ser informadas juntas", 400);
    }

    if (latitude === null || longitude === null) {
        return { latitude: null, longitude: null };
    }

    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
        throw new ErroAplicacao("Latitude invalida", 400);
    }
    if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
        throw new ErroAplicacao("Longitude invalida", 400);
    }

    return { latitude, longitude };
}
