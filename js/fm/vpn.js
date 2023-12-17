/** Scripting for VPN-related tasks. */
class VpnCredsManager {
    logIt() {
        console.log('Non-static member.'); // Jenkins
    }

    static get credentialCreated() {
        this._credentialCreated = this._credentialCreated || new MEvent();
        return this._credentialCreated;
    }

    static get credentialDeactivated() {
        this._credentialDeactivated = this._credentialDeactivated || new MEvent();
        return this._credentialDeactivated;
    }

    static getLocations() {

        return api.req({a: 'vpnr'})
            .then(({result}) => {
                assert(Array.isArray(result));

                return result;
            })
            .catch((ex) => {
                console.error('[VPN Manager] Unexpected error from API when fetching locations.', ex);
            });
    }

    static getActiveCredentials() {

        return api.req({a: 'vpng'})
            .then(({result}) => {
                assert(typeof result === 'object');

                return result;
            })
            .catch((ex) => {
                if (ex === ENOENT) {
                    return ex;
                }

                console.error('[VPN Manager] Unexpected error from API when fetching active credentials.', ex);
            });
    }

    static async createCredential() {
        const keypair = nacl.box.keyPair();

        return api.req({a: 'vpnp', k: ab_to_base64(keypair.publicKey)})
            .then(({result}) => {
                assert(typeof result === 'object');

                const cred = {
                    credNum: result[0],
                    vpnSubclusterId: result[1],
                    interfaceV4Address: result[2],
                    interfaceV6Address: result[3],
                    peerPublicKey: result[4],
                    locations: result[5],
                    keypair: keypair,
                };

                VpnCredsManager.credentialCreated.invoke(cred);
                return cred;
            })
            .catch((ex) => {
                if (ex === EACCESS) {
                    console.warn('[VPN Manager] You are not authorised to create VPN credentials. '
                        + 'Upgrade to Pro, then try again.');
                    return ex;
                }
                if (ex === ETOOMANY) {
                    console.warn('[VPN Manager] You have exceeded your credential limit. '
                        + 'Please deactivate one credential, then try again.');
                    return ex;
                }

                console.error('[VPN Manager] Unexpected error from API when creating a credential.', ex);
            });
    }

    static deactivateCredential(slotNum) {

        return api.req({a: 'vpnd', s: slotNum})
            .then(({result}) => {
                assert(result === 0);

                this.credentialDeactivated.invoke(slotNum);
                return result;
            })
            .catch((ex) => {
                console.error('[VPN Manager] Unexpected error from API when deactivating a credential.', ex);
            });
    }

    static generateIniConfig(cred, locationIndex = 0) {
        // assemble endpoint
        let endpoint = `${cred.locations[locationIndex]}.vpn`;
        if (cred.vpnSubclusterId > 1) {
            endpoint += cred.vpnSubclusterId;
        }
        endpoint += '.mega.nz:51820';

        let config = '[Interface]\n';
        config += `PrivateKey = ${btoa(ab_to_str(cred.keypair.secretKey))}\n`;
        config += `Address = ${cred.interfaceV4Address}/32, ${cred.interfaceV6Address}/128\n`;
        config += 'DNS = 8.8.8.8, 2001:4860:4860::8888\n\n';
        config += '[Peer]\n';
        config += `PublicKey = ${btoa(base64urldecode(cred.peerPublicKey))}\n`;
        config += 'AllowedIPs = 0.0.0.0/0, ::/0\n';
        config += `Endpoint = ${endpoint}\n`;

        return config;
    }
}
