export interface DTOCriarEndereco {
    cep: string;
    numero?: string;
    /** Ignorado: o dono vem do JWT. Mantido só por compatibilidade de payload. */
    usuarioId?: number;
}
