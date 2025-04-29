export enum userRole{
    CONSUMER = 'CONSUMER',
    VENDOR = 'VENDOR',
}

export enum sellerType{
    INDIVIDUAL = 'INDIVIDUAL',
    BUSSINES = 'EMPRESA',
}

export interface CreateUser {
    email: string;
    password: string;
    name: string;
    lastname: string;
    rol: userRole; 
    address?: string;
    nameBusiness?: string;
    description?: string;
    typeVendor?: sellerType;
}
