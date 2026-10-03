import * as bcrypt from 'bcrypt';
import ENV from '../../config';

const hashPass = async (pass: string) => {
    const salt = Number(ENV.SALT)
    return await bcrypt.hash(pass, salt)
}

const comparePass = async (pass: string, hash: string) => {
    return await bcrypt.compare(pass, hash)
}



const crypto = {
    hashPass,
    comparePass
}
export default crypto