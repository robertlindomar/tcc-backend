export interface DTOCriarEndereco {
    cep: string;
    numero?: string;
    latitude?: number | null;
    longitude?: number | null;
    /** Ignorado: o dono vem do JWT. Mantido só por compatibilidade de payload. */
    usuarioId?: number;
}
