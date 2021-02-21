/**
 * QR Code scan
 */
import React, { useState, useEffect, useRef } from 'react';
import { Image, StyleSheet } from 'react-native';
import { Container, Content, Header, View, Button, Icon, Fab, Card, CardItem, Title, Body, Text, Toast, Spinner } from 'native-base';
import * as Device from 'expo-device';
import { BarCodeScanner } from 'expo-barcode-scanner';
import { Video, AVPlaybackStatus } from 'expo-av';
import { DeviceMotion } from 'expo-sensors';
import * as WebBrowser from 'expo-web-browser';
import Clipboard from 'expo-clipboard';
import axios from 'axios';

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
    },
});

const initialMotion = {
    rotation: {
        alpha: 0, beta: 0, gamma: 0
    }
};

let calibMotion = {
    rotation: {
        alpha: 0, beta: 0, gamma: 0
    }
};

const initialQrData = {
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    data: "null data",
};

const stillImage = 'http://picsum.photos/200';

const homePageUrl = "https://nextjs.crazydreamproject.vercel.app/pictonqr";

const QrDataType = {
    none: "null data",
    image: "Image URL",
    video: "Video URL",
    url: "Web URL but not image nor video",
    data: "RAW data"
};

const themeColor = '#5067FF';

export const ScannerView = (props) => {
    const [hasPermission, setHasPermission] = useState(null);
    const [scanned, setScanned] = useState(false);
    const [calibrate, setCalibrate] = useState(true);
    const [motion, setMotion] = useState(initialMotion);
    const [qrdata, setQrData] = useState(initialQrData);
    const [datatype, setDataType] = useState(QrDataType.none);
    const [changed, setChanged] = useState(false);
    const video = useRef(null);
    const [play, setPlay] = useState({});
    const [favicon, setFavicon] = useState(false);
    const favUrl = qrdata.data.split('/')[0] + '//' + qrdata.data.split('/')[2] + '/favicon.ico';

    useEffect(() => {
        (async () => {
            const { status } = await BarCodeScanner.requestPermissionsAsync();
            setHasPermission(status === 'granted');
        })();
        (async () => {
            const isAvailable = await DeviceMotion.isAvailableAsync();
            if (isAvailable) {
                DeviceMotion.addListener((motionData) => {
                    // humm. using both motion and camera(barcodescanner) in android drops qrscan speed hopelessly...
                    if (Device.osName === 'Android') {
                        return;
                    }
                    setMotion(motionData);
                    if (calibrate) {
                        handleCalibrate();
                    }
                });
            } else {
                //console.log("DeviceMotion not available...");
            }
        })();
    }, []);

    const handleCalibrate = () => {
        if (motion.rotation) {
            calibMotion.rotation.alpha = motion.rotation.alpha;
            calibMotion.rotation.beta = motion.rotation.beta;
            calibMotion.rotation.gamma = motion.rotation.gamma;
        }
        setCalibrate(false);
    };

    const handleBarCodeScanned = ({ type, data, bounds, cornerPoints }) => {
        setScanned(true);
        if (qrdata.data !== data) {
            setChanged(true);
            setFavicon(false);
            // try out with image first if starts with http
            setDataType(data.startsWith("http") ? QrDataType.image : QrDataType.data);
        } else {
            setChanged(false);
        }
        setQrData({
            x: bounds.origin.x,
            y: bounds.origin.y,
            width: bounds.size.width,
            height: bounds.size.height,
            data: data,
        });
    };

    if (changed) {
        Toast.show({
            text: qrdata.data,
        });
    }

    const handleImageError = (ev) => {
        Toast.show({
            text: qrdata.data,
        });
        // it was not image. try video next, if starts with http.
        setDataType(qrdata.data.startsWith("http") ? QrDataType.video : QrDataType.data);
    };

    const handleImageLoad = () => {
        Toast.show({
            text: qrdata.data,
        });
    }

    const handleVideoError = (ev) => {
        Toast.show({
            text: qrdata.data,
        });
        // it was not video. treat as url if starts with http
        setDataType(qrdata.data.startsWith("http") ? QrDataType.url : QrDataType.data);
        if (Device.osName === 'Android') {
            ; // humm, setting <Image> with favicon.ico source does not show, and is onLoad OK, onError not triggered...
        } else {
            axios.get(favUrl).then((results) => { setFavicon(true); }); // ios works fine
        }
    }

    const handleVideoLoad = () => {
        Toast.show({
            text: qrdata.data,
        });
    }

    const handleShowData = () => {
        // copy data to clipboard
        Clipboard.setString(qrdata.data);
        Toast.show({
            text: `Copied ${qrdata.data}`,
        });
    };

    const handleOpenUrl = () => {
        Toast.show({
            text: `Opening ${qrdata.data} in browser...`
        });
        WebBrowser.openBrowserAsync(qrdata.data);
    };

    const handleOpenHomePage = () => {
        WebBrowser.openBrowserAsync(homePageUrl);
    }

    const handleReset = () => {
        setScanned(false);
        setCalibrate(true);
        setMotion(initialMotion);
        setQrData(initialQrData);
        setDataType(QrDataType.none);
        setChanged(false);
        setFavicon(false);
    };

    /**
     * UI related stuffs
     */
    if (hasPermission === null) {
        return <RequestCameraPermissionView />;
    }
    if (hasPermission === false) {
        return <CameraAccessDeniedView />;
    }

    if (scanned) {
        /*
        Toast.show({
            text: qrdata.data
        });
        */
    } else {
        Toast.show({
            text: "Scanning QR...",
            position: "top",
            duration: 9999,
        });
    }

    const imageStyle = {
        position: 'absolute',
        left: qrdata.x,
        top: qrdata.y,
        width: qrdata.width,
        height: qrdata.height,
        backgroundColor: datatype === QrDataType.image ? 'transparent' : (favicon ? 'white' : themeColor),
        transform: [
            { rotate: `${(motion.rotation.alpha - calibMotion.rotation.alpha) / 2}rad` },
            //            { rotateX: `${(motion.rotation.alpha - calibMotion.rotation.alpha) / 2}rad` },
            //            { rotateY: `${(motion.rotation.beta - calibMotion.rotation.beta) / 2}rad` },
            //            { rotateZ: `${(motion.rotation.gamma - calibMotion.rotation.gamma) / 2}rad` },
        ],
    };
    const iconStyle = {
        fontSize: qrdata.width / 2,
        color: 'white',
    };

    const urlError = (ev) => {
        //alert(typeof ev.nativeEvent);
    };
    const urlOK = (ev) => {
        //alert("favUrl OK.");
    };

    return (
        <Container>
            <View style={styles.container}>
                <BarCodeScanner
                    onBarCodeScanned={handleBarCodeScanned}
                    style={StyleSheet.absoluteFillObject}
                    barCodeTypes={[BarCodeScanner.Constants.BarCodeType.qr]}
                />
                {(datatype === QrDataType.data) &&
                    <Button primary iconLeft style={{ opacity: 1.0, ...imageStyle }} onPress={handleShowData} >
                        <Icon style={iconStyle} type="Ionicons" name="information-circle"></Icon>
                    </Button>}
                {(datatype === QrDataType.url && favicon === false) &&
                    <Button primary iconLeft style={{ opacity: 1.0, ...imageStyle }} onPress={handleOpenUrl} >
                        <Icon style={iconStyle} type="Ionicons" name="earth"></Icon>
                    </Button>}
                {(datatype === QrDataType.url && favicon === true) &&
                    <>
                        <Image style={{ width: qrdata.width / 2, height: qrdata.height / 2, ...imageStyle }} source={{ url: favUrl }} onError={urlError} onLoad={urlOK} />
                        <Button style={{opacity: 0.0, ...imageStyle}} onPress={handleOpenUrl} />
                    </>
                }
                {(datatype === QrDataType.image) &&
                    <>
                        <Image style={imageStyle} source={{ uri: qrdata.data }} onError={handleImageError} onLoad={handleImageLoad} />
                        <Button style={{opacity: 0.0, ...imageStyle}} onPress={handleShowData} />
                    </>
                }
                {(datatype === QrDataType.video) &&
                    <>
                        <Video ref={video} style={imageStyle} source={{ uri: qrdata.data }} useNativeControls resizeMode="contain" isLooping
                            onPlaybackStatusUpdate={status => setPlay(() => status)} onLoad={handleVideoLoad} onError={handleVideoError} />
                        <View >
                            <Button title={play.isPlaying ? 'Pause': 'Play'} 
                                onPress={() => play.isPlaying ? video.current.pauseAsync() : video.current.playAsync() } />
                        </View>
                    </>
                }
                <Fab
                    active={true}
                    direction="up"
                    containerStyle={{}}
                    style={{ backgroundColor: themeColor }}
                    position="bottomRight"
                    onPress={handleReset}>
                    <Icon name="sync" />
                    <Button style={{ backgroundColor: themeColor }} onPress={handleOpenHomePage}>
                        <Icon name="question" />
                    </Button>
                </Fab>
            </View>
        </Container>
    );
};

const PictOnQrHeader = (props) => {
    return (
        <Header>
            <Body>
                <Title>PictOnQR Scanner</Title>
            </Body>
        </Header>
    );
};

const RequestCameraPermissionView = (props) => {
    return (
        <Container>
            <PictOnQrHeader />
            <Content>
                <Card>
                    <CardItem header bordered>
                        <Text>Requesting for camera permission</Text>
                    </CardItem>
                    <CardItem cardBody>
                        <Body style={{ alignItems: "center" }}>
                            <Spinner></Spinner>
                        </Body>
                    </CardItem>
                </Card>
            </Content>
        </Container>
    );
};

const CameraAccessDeniedView = (props) => {
    return (
        <Container>
            <PictOnQrHeader />
            <Content>
                <Card>
                    <CardItem header bordered>
                        <Text>No access to camera</Text>
                    </CardItem>
                </Card>
            </Content>
        </Container>
    );
};
