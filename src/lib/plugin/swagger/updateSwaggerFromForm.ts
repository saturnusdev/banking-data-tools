const FORM_TO_SWAGGER_MAP = {
    title: 'info.title',
    titleName: 'info.x-ibm-name',
    apiVersion: 'info.version',
    serviceName: 'x-ibm-configuration.properties.service-name.value',
    serviceVersion: 'x-ibm-configuration.properties.service-version.value',
    serviceCode: 'x-ibm-configuration.properties.service-code.value',
    sourceSystem: 'x-ibm-configuration.properties.source-system.value',
    providerSystem: 'x-ibm-configuration.properties.provider-system.value',
    queueName: 'x-ibm-configuration.properties.queue-request.value',
    basePath: 'basePath'
};


export function updateSwaggerFromForm(swagger, formData) {
    for (const [formKey, swaggerPath] of Object.entries(FORM_TO_SWAGGER_MAP)) {
        const value = formData[formKey];

        if (value === undefined || value === null || value === '') continue;

        if (hasPath(swagger, swaggerPath)) {
            setPath(swagger, swaggerPath, value);
        }
    }
}


function hasPath(obj, path) {
    return path.split('.').every(key => {
        if (!obj || typeof obj !== 'object' || !(key in obj)) {
            return false;
        }
        obj = obj[key];
        return true;
    });
}

function setPath(obj, path, value) {
    const keys = path.split('.');
    let cur = obj;

    for (let i = 0; i < keys.length - 1; i++) {
        cur = cur[keys[i]];
    }

    cur[keys[keys.length - 1]] = value;
}
