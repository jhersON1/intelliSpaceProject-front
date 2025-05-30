export interface VisualRepresentation {
    id: string;
    productId: string;
    type: string;
    url: string;
    altText: string;
    isPrincipal: boolean;
}

export enum TypeRepresentation {
    IMAGE = 'Image',
    MODEL3D = 'Model3D',
    EXPERIENCEAR = 'ExperienceAR',
}

export enum FormatModel3D {
    GLB = '.glb',
    FBX = '.fbx',
    OBJ = '.obj',
    DAE = '.dae',
    USD = '.usd',
    GLTF = '.gltf',
    USDZ = '.usdz',
}

export interface CreateVisualRepresentationDto {
    productId: string;
    type: TypeRepresentation;
    url?: string;

    // Campos específicos de Image
    altText?: string;
    isPrincipal?: boolean;

    // Campos específicos de Model3D
    format?: FormatModel3D;
    texture?: string;
    scale?: Record<string, number>;
    urlIOS3D?: string;

    // Campos específicos de ExperienceAR
    instructions?: string;
    devicerequirements?: string[];
    urlIOSAR?: string;
}
