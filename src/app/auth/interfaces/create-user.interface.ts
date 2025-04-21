enum userRole{
    CONSUMER = 'CONSUMER',
    VENDOR = 'VENDOR',
}

enum sellerType{
    SELLER = 'SELLER',
    DISTRIBUTOR = 'DISTRIBUTOR',
}

export interface CreateUser {
    email: string;
    password: string;
    nombre: string;
    apellido: string;
    rol: userRole; 
    direccion?: string;
    nombreNegocio?: string;
    descripcion?: string;
    tipoVendedor?: sellerType;
}
