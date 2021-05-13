import { makeStyles } from "@material-ui/core/styles";

const NFTCard = ({ image, name, type, quantity }) => {
  const classes = useStyles();
  return (
    <div className={classes.nftCard}>
      <div className={classes.imageContainer}>
        <div className={classes.imgPlaceholder}></div>
        <img
          src={image || "images/placeholder.png"}
          className={classes.nftImg}
          alt="image"
        />
      </div>
      <div className={classes.nftDetails}>
        <h3 className={classes.nftTitle}>{name}</h3>
        <div className={classes.nftSubTitle}>
          <span>{type}</span>
          <span>
            {quantity && type === "erc1155" && "Quantity: " + quantity}
          </span>
        </div>
      </div>
    </div>
  );
};

const useStyles = makeStyles((theme) => ({
  nftCard: {
    backgroundColor: "white",
    borderRadius: "10px",
    width: "100%",
    overflow: "hidden",
    padding: "16px",
    border: "0.5px solid #E8E8E8",
    height: "100%",
    boxShadow: "0px 2px 10px rgb(0 0 0 / 10%)",
  },
  imageContainer: {
    position: "relative",
    borderRadius: "10px",
    overflow: "hidden",
    marginBottom: "12px",
  },
  imgPlaceholder: {
    width: "100%",
    paddingBottom: "100%",
  },
  nftImg: {
    display: "block",
    width: "100%",
    height: "100%",
    objectFit: "cover",
    backgroundColor: "#EDF0F7",
    position: "absolute",
    top: 0,
    left: 0,
    zIndex: 1,
  },
  nftDetails: {
    padding: "0 2px",
  },
  nftTitle: {
    margin: "0 0 4px 0",
    textTransform: "capitalize",
    fontSize: "17px",
  },
  nftSubTitle: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "14px",
    color: "#515C72",
    fontWeight: "600",

    "& span": {
      textTransform: "uppercase",
    },
  },
}));

export default NFTCard;
