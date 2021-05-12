import React, { useState, useEffect } from "react";
import axios from "axios";

// components
import ResultModal from "./UI/ResultModal";
import ErrorBox from "./UI/ErrorBox";

// material ui
import {
  Button,
  Container,
  Checkbox,
  Grid,
} from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";

import {
  domainType,
  metaTransactionType,
  domainData721,
  domainData1155,
} from "../utils/biconomy-vars";
import { getSignatureParameters, web3 } from "./ConnectWallet";

import { pinJSONToIPFS, pinFileToIPFS, encodedParams } from "../utils/ipfs";

import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
toast.configure();

const Form = ({
  signerAddress,
  contract_1155,
  contract_721,
  setTrsHash,
  setTriggerModal,
  setArkaneUrl,
  providerMetamask,
}) => {
  const classes = useStyles();

  // hooks
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [surl, setSurl] = useState("");
  const [file, setFile] = useState(null);
  const [imgSrc, setImgSrc] = useState("");
  const [imgHash, setImgHash] = useState("");
  const [nftType, setNftType] = useState("ERC721");
  const [ercTwoNum, setErcTwoNum] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [err, setErr] = useState("");
  const [errors, setErrors] = useState({
    name: "",
    desc: "",
    file: "",
  });
  const [adult, setAdult] = useState(false);

  // validate form
  const validateName = () => {
    if (name === "") {
      setErrors((pS) => ({ ...pS, name: "Name cannot be empty" }));
    } else {
      setErrors((pS) => ({ ...pS, name: "" }));
    }
  };
  const validateDesc = () => {
    if (desc === "") {
      setErrors((pS) => ({ ...pS, desc: "Add description for your token" }));
    } else {
      setErrors((pS) => ({ ...pS, desc: "" }));
    }
  };
  // handle file upload
  const handleFile = async (e) => {
    // console.log("object")
    if (e.target.files[0]?.size < 1e7) {
      setFile(e.target.files[0]);
      const cid = await pinFileToIPFS(e.target.files[0]);
      toast("File uploaded to IPFS", { type: "success" });
      console.log("IPFS imgHash", cid);
      setImgHash(cid);
      setErrors((pS) => ({ ...pS, file: "" }));
      // console.log(e.target.files[0]?.size < 1e7)
      if (e.target.files.length !== 0) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setImgSrc(e.target.result);
        };
        reader.readAsDataURL(e.target.files[0]);
      }
    } else {
      setErrors((pS) => ({ ...pS, file: "File should be less than 10MB" }));
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    // if all req fields are avaialable
    if (name && desc && file && signerAddress && imgHash) {
      console.log("Submitting...");
      setIsLoading(true);
      setErr("");
      setTrsHash("");

      // Upload files on IPFS
      let ipfsHash = "";
      try {
        ipfsHash = await pinJSONToIPFS({
          name: name,
          description: desc,
          image: "https://gateway.pinata.cloud/ipfs/" + imgHash,
          external_url: surl,
        });
        toast("JSON data uploaded to IPFS", { type: "success" });
        console.log(ipfsHash);
      } catch (err) {
        console.log("Error Uploading files on IPFS", err);
        setErr("Uploading files on IPFS failed");
      }

      // If Metamask use backend
      if (providerMetamask) {
        if (adult) {
          const res = await axios.post("http://localhost:8080/add", {
            minter: signerAddress,
            name: name,
            description: desc,
            image: "https://gateway.pinata.cloud/ipfs/" + imgHash,
            external_url: surl,
            uri: "https://gateway.pinata.cloud/ipfs/" + ipfsHash,
            type: nftType,
            count: nftType === "ERC1155" ? ercTwoNum : 1,
          });
          console.log(res);
          setIsLoading(false);
          setTrsHash("ok");
          setTriggerModal(true);
          toast("NFT Added", { type: "success" });
        } else {
          const res = await axios.post("http://localhost:8080/mint", {
            minter: signerAddress,
            type: nftType,
            uri: "https://gateway.pinata.cloud/ipfs/" + ipfsHash,
            count: nftType === "ERC1155" ? ercTwoNum : 1,
          });
          console.log(res.data);
          setTrsHash(res.data.transactionHash);
          setTriggerModal(true);
          setIsLoading(false);
          // setArkaneUrl("ok");
          toast("NFT Minted", { type: "success" });
        }
      }
      // If Arkane mint directly
      else {
        if (nftType === "ERC721") {
          let nonce = await contract_721.methods.getNonce(signerAddress).call();
          let functionSignature = contract_721.methods
            .mintToCaller(
              signerAddress,
              "https://gateway.pinata.cloud/ipfs/" + ipfsHash
            )
            .encodeABI();

          let message = {};
          message.nonce = parseInt(nonce);
          message.from = signerAddress;
          message.functionSignature = functionSignature;

          const dataToSign = JSON.stringify({
            types: {
              EIP712Domain: domainType,
              MetaTransaction: metaTransactionType,
            },
            domain: domainData721,
            primaryType: "MetaTransaction",
            message: message,
          });

          const rpc = {
            jsonrpc: "2.0",
            id: 999999999999,
            method: "eth_signTypedData_v4",
            params: [signerAddress, dataToSign],
          };

          const txnhash = await web3.currentProvider.sendAsync(
            rpc,
            async function (error, response) {
              //console.log(response)
              let { r, s, v } = getSignatureParameters(response.result);

              const tx = await contract_721.methods
                .executeMetaTransaction(
                  signerAddress,
                  functionSignature,
                  r,
                  s,
                  v
                )
                .send({ from: signerAddress })
                .once("confirmation", (confirmationNumber, receipt) => {
                  //console.log(confirmationNumber)
                  //console.log(receipt)
                  console.log(
                    "0x72B6Dc1003E154ac71c76D3795A3829CfD5e33b9/" +
                      parseInt(receipt.events.Transfer.raw.topics[3])
                  );
                  setArkaneUrl(
                    "0x72B6Dc1003E154ac71c76D3795A3829CfD5e33b9/" +
                      parseInt(receipt.events.Transfer.raw.topics[3])
                  );
                  setTrsHash(receipt.transactionHash);
                  setTriggerModal(true);
                })
                .on("error", (error) => {
                  console.log(error);
                  setErr("Transaction failed");
                });
              //console.log(tx)
              setIsLoading(false);
              toast("NFT Minted", { type: "success" });
            }
          );
        } else if (nftType === "ERC1155") {
          contract_1155.handleRevert = true; // https://web3js.readthedocs.io/en/v1.3.4/web3-eth.html#handlerevert

          let nonce = await contract_1155.methods
            .getNonce(signerAddress)
            .call();
          let functionSignature = contract_1155.methods
            .mintTocaller(signerAddress, ercTwoNum, encodedParams, ipfsHash)
            .encodeABI();

          let message = {};
          message.nonce = parseInt(nonce);
          message.from = signerAddress;
          message.functionSignature = functionSignature;

          const dataToSign = JSON.stringify({
            types: {
              EIP712Domain: domainType,
              MetaTransaction: metaTransactionType,
            },
            domain: domainData1155,
            primaryType: "MetaTransaction",
            message: message,
          });

          const rpc = {
            jsonrpc: "2.0",
            id: 999999999999,
            method: "eth_signTypedData_v4",
            params: [signerAddress, dataToSign],
          };

          const txnhash = web3.currentProvider.sendAsync(
            rpc,
            async function (error, response) {
              console.log(response);
              let { r, s, v } = getSignatureParameters(response.result);

              const tx = contract_1155.methods
                .executeMetaTransaction(
                  signerAddress,
                  functionSignature,
                  r,
                  s,
                  v
                )
                .send({ from: signerAddress })
                .once("confirmation", (confirmationNumber, receipt) => {
                  //console.log(confirmationNumber)
                  //console.log(receipt)
                  console.log(
                    "0xfd1dBD4114550A867cA46049C346B6cD452ec919/" +
                      parseInt(receipt.events.TransferSingle.returnValues[3])
                  );
                  setArkaneUrl(
                    "0xfd1dBD4114550A867cA46049C346B6cD452ec919/" +
                      parseInt(receipt.events.TransferSingle.returnValues[3])
                  );
                  setTrsHash(receipt.transactionHash);
                  setTriggerModal(true);
                })
                .on("error", (error) => {
                  console.log(error);
                  setErr("Transaction failed");
                });
              // console.log(tx)
              setIsLoading(false);
              toast("NFT Minted", { type: "success" });
            }
          );
        } else {
          validateName();
          validateDesc();
          setIsLoading(false);
          if (!signerAddress) {
            setErr("Connect to wallet first");
          } else {
            setErr("Enter all mandatory fields");
          }
        }
      }
    }
  };

  return (
    <div className={classes.formSection}>
      <Container className={classes.container}>
        <div className={classes.formContainer}>
          <div className="form-title">
            <h3>Mint your NFT</h3>
          </div>
          <form
            noValidate
            autoComplete="off"
            onSubmit={onSubmit}
            className={classes.form}
          >
            <Grid container spacing={3}>
              {/* file upload section */}
              <Grid item xs={12} md={6}>
                <div className={classes.uploadSection}>
                  <label className={classes.label} htmlFor="upload-file">
                    Upload
                  </label>
                  <div className={classes.drag}>
                    <input
                      accept="audio/*, video/*, image/*, .html, .pdf"
                      id="upload-file"
                      onChange={handleFile}
                      type="file"
                      hidden
                    />
                    <p>
                      {/* Drop your file here or{" "} */}
                      <label htmlFor="upload-file">Browse file</label>
                    </p>
                    <br />
                    <p>
                      Supports JPG, PNG and MP4 videos. Max file size : 10MB.
                    </p>
                    {errors.file && <p className="imgErr">{errors.file}</p>}
                  </div>
                  {imgSrc && (
                    <div className={classes.imgPreviewContainer}>
                      <img src={imgSrc} alt="preview-img" />
                      <p>
                        <span>{file.name}</span>
                        <span>
                          {file.size > 100000
                            ? `${file.size / 100000} MB`
                            : file.size > 1000
                            ? `${file.size / 1000} KB`
                            : `${file.size} MB`}
                        </span>
                      </p>
                    </div>
                  )}
                </div>
              </Grid>

              {/* input section */}
              <Grid item xs={12} md={6}>
                <Grid item xs={12}>
                  <div className={classes.inputContainer}>
                    <label htmlFor="name">Title</label>
                    <input
                      type="text"
                      className={`${errors.name ? "inputErr" : ""}`}
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        setErr("");
                        setErrors((pS) => ({ ...pS, name: "" }));
                      }}
                      onBlur={validateName}
                      required
                      id="name"
                    />
                    {errors.name && (
                      <p className={classes.inputErrMsg}>{errors.name}</p>
                    )}
                  </div>
                </Grid>

                <Grid item xs={12}>
                  <div className={classes.inputContainer}>
                    <label htmlFor="description">Description</label>
                    <textarea
                      type="text"
                      value={desc}
                      className={`${errors.desc ? "inputErr" : ""}`}
                      style={{ minHeight: "100px" }}
                      onChange={(e) => {
                        setErrors((pS) => ({ ...pS, desc: "" }));
                        setErr("");
                        setDesc(e.target.value);
                      }}
                      onBlur={validateDesc}
                      required
                      id="description"
                    ></textarea>
                    {errors.desc && (
                      <p className={classes.inputErrMsg}>{errors.desc}</p>
                    )}
                  </div>
                </Grid>

                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <p className={classes.label}>NFT Type</p>
                    <div className={classes.nftBtnContainer}>
                      <Button
                        className={classes.nftBtn}
                        disabled={nftType === "ERC721" ? true : false}
                        onClick={() => {
                          setErcTwoNum(1);
                          setNftType("ERC721");
                        }}
                      >
                        ERC721
                      </Button>
                      <Button
                        className={classes.nftBtn}
                        disabled={nftType === "ERC1155" ? true : false}
                        onClick={() => setNftType("ERC1155")}
                      >
                        ERC1155
                      </Button>
                    </div>
                  </Grid>

                  <Grid item xs={6}>
                    <div className={classes.inputContainer}>
                      <label htmlFor="quantity">Quantity</label>
                      <input
                        type="number"
                        placeholder="1"
                        disabled={nftType === "ERC1155" ? false : true}
                        value={ercTwoNum}
                        onChange={(e) => setErcTwoNum(e.target.value)}
                        id="quantity"
                      />
                    </div>
                  </Grid>
                </Grid>

                <Grid item xs={12}>
                  <div className={classes.inputContainer}>
                    <label htmlFor="sm-url">
                      Social Media URL <span>(optional)</span>
                    </label>
                    <input
                      type="url"
                      placeholder="https://twitter.com/example"
                      value={surl}
                      pattern="https?://.+"
                      onChange={(e) => setSurl(e.target.value)}
                      id="sm-url"
                    />
                  </div>
                </Grid>

                <Grid item xs={12}>
                  <div className={classes.flex}>
                    <Checkbox
                      checked={adult}
                      onChange={(e) => setAdult(e.target.checked)}
                      color="primary"
                      inputProps={{ "aria-label": "secondary checkbox" }}
                      className={classes.checkbox}
                      id="adult-checkbox"
                    />
                    <label
                      className={classes.labelSmall}
                      htmlFor="adult-checkbox"
                    >
                      Content is 18+
                    </label>
                  </div>
                </Grid>

                <p className={classes.note}>
                  Once your NFT is minted on the Polygon blockchain, you will
                  not be able to edit or update any of its information.
                </p>

                <Button
                  type="submit"
                  disabled={imgHash ? false : true}
                  className={`${classes.btn} ${classes.filled}`}
                  style={{ marginBottom: "30px" }}
                >
                  Mint NFT
                </Button>
              </Grid>
            </Grid>
            {err && <ErrorBox message={err} />}
          </form>
        </div>
      </Container>
    </div>
  );
};

const useStyles = makeStyles((theme) => ({
  ...theme.overrides.mui,
  ...theme.overrides.formStyle,
  formSection: {
    backgroundColor: "#F4F7F9",
    paddingBottom: "70px",
  },
  formContainer: {
    borderRadius: "16px",
    top: "-70px",
    filter: "drop-shadow(0px 2px 24px rgba(0, 0, 0, 0.1))",
    position: "relative",
    overflow: "hidden",

    "& .form-title": {
      padding: "0 26px",
      lineHeight: "70px",
      height: "70px",
      borderBottom: "1px solid #E8E8E8",
      backgroundColor: "#F9F9FE",
      fontSize: "18px",
      fontWeight: "600",

      "& h3": {
        margin: 0,
      },
    },
  },
  form: {
    backgroundColor: "#ffffff",
    padding: "26px",
    width: "100%",
  },
  // file upload section
  uploadSection: {
    "& p": {
      fontSize: "12px",
      fontWeight: "600",
      color: "#61677e",
      textAlign: "left",
      margin: "0 0 20px 0",
    },
  },

  drag: {
    // height: 140px;
    borderRadius: "6px",
    border: "1px dashed #C7CBD9",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignTtems: "center",
    padding: "60px 0",
    marginTop: "5px",

    "& p": {
      textAlign: "center",
      color: "#939bba",
      fontSize: "14px",
      fontWeight: "600",
      margin: "0",

      "& label": {
        color: "#8247e5",
        textDecoration: "underline",
        cursor: "pointer",

        "&:hover": {
          color: "#7533e2",
        },
      },

      "&.imgErr": {
        textAlign: "center",
        color: "#ff0000",
        fontSize: "12px",
        marginTop: "10px",
      },
    },
  },

  imgPreviewContainer: {
    width: "100%",
    display: "flex",
    marginTop: "20px",
    padding: "10px",
    backgroundColor: "white",
    borderRadius: "6px",
    border: "1px solid #c7cbd9",

    "& img": {
      height: "60px",
      width: "60px",
      objectFit: "cover",
      marginRight: "20px",
      borderRadius: "5px",
      border: "1px solid #c7cbd9",
    },

    "& p": {
      display: "flex",
      flexDirection: "column",
      margin: "0",

      "& span": {
        "&:first-child": {
          fontWeight: "bold",
          marginBottom: "3px",
          fontSize: "15px",
        },
      },
    },
  },

  nftBtnContainer: {
    backgroundColor: "white",
    border: "1px solid #C7CBD9",
    display: "flex",
    padding: "5px",
    borderRadius: "5px",
    position: "relative",
    height: "50px",
    marginTop: "5px",
  },

  nftBtn: {
    height: "50px",
    width: "50%",
    height: "calc(50px - 12px)",
    borderRadius: "5px",
    border: "0",
    outline: "0",
    cursor: "pointer",
    fontWeight: "600",

    "&:first-child ": {
      marginRight: "5px",
    },

    "&:disabled": {
      backgroundColor: "#3E3B51",
      color: "white",
    },

    "&:enabled": {
      backgroundColor: "#F6F6FF",
    },
  },

  inputErrMsg: {
    position: "absolute",
    margin: 0,
    zIndex: 2,
    top: "40px",
    right: "15px",
    color: "red",
    fontWeight: "600",
  },

  label: {
    color: "#7533e2",
    fontSize: "14px",
    fontWeight: "bold",
    margin: 0,
  },

  flex: {
    display: "flex",
    alignItems: "center",
    marginRight: "4px",
  },
  checkbox: {
    width: "22px",
    height: "22px",
    borderColor: "#C7CBD9",
    marginRight: "11px",
  },
  labelSmall: {
    fontSize: "14px",
    color: "#61677E",
    lineHeight: "21px",
    fontWeight: "600",
  },

  note: {
    fontSize: "12px",
    color: "#61677e",
    marginTop: "40px",
  },
}));

export default Form;
