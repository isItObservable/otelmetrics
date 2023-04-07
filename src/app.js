const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const connectDB = require("./config/db");

const _ = require("lodash");



connectDB();
const itemsSchema = {
  name: String,
};

const Item = mongoose.model("Item", itemsSchema);

const buyFood = new Item({
  name: "Buy Food",
});
const cookFood = new Item({
  name: "Cook Food",
});
const eatFood = new Item({
  name: "Eat Food",
});

const defaultItems = [buyFood, cookFood, eatFood];

const ListItems = {
  name: String,
  items: [itemsSchema],
};
const List = mongoose.model("List", ListItems);

const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

app.set("view engine", "ejs");

app.get("/", function (req, res) {
  Item.find({}, function (err, result) {
    if (result.length === 0) {
      Item.insertMany(defaultItems, function (err) {
        if (err) {
          console.log(err);
        } else {
          console.log("success");
        }
      });
      res.redirect("/");
    } else {
      res.render("list", { listTitle: "Today", newListItem: result });
    }
  });
});

app.get("/:pageName", function (req, res) {
  const customPageName = _.capitalize(req.params.pageName);
  List.findOne({ name: customPageName }, function (err, foundList) {
    if (!err) {
      if (!foundList) {
        const list = new List({
          name: req.params.pageName,
          items: defaultItems,
        });
        list.save();
        res.redirect("/" + customPageName);
      } else {
        res.render("list", {
          listTitle: customPageName,
          newListItem: foundList.items,
        });
      }
    }
  });
});

app.post("/", function (req, res) {
  const newItemName = req.body.newItem;
  const listTitle = req.body.button;
  const newItem = new Item({
    name: newItemName,
  });

  if (listTitle === "Today") {
    newItem.save();
    res.redirect("/");
  } else {
    List.findOne({ name: listTitle }, function (err, foundList) {
      foundList.items.push(newItem);
      foundList.save();
      res.redirect("/" + listTitle);
    });
  }
});

app.post("/remove", function (req, res) {
  const checkboxValue = req.body.checkbox;
  const listTitle = req.body.listTitle;

  if (listTitle === "Today") {
    Item.deleteOne({ _id: checkboxValue }, function (err) {
      console.log(err);
    });
    res.redirect("/");
  } else {
    List.findOneAndUpdate(
      { name: listTitle },
      { $pull: { items: { _id: checkboxValue } } },
      function (err) {
        console.log(err);
        res.redirect("/" + listTitle);
      }
    );
    // List.findOne({ name: listTitle }, function (err, foundLit) {
    //   foundLit.items.pop(checkboxValue);
    //   console.log(checkboxValue);
    //   foundLit.save();
    //   res.redirect("/" + listTitle);
    // });
  }
});

// let port = process.env.port;

app.listen(process.env.PORT, function () {
  console.log("server has started successfully");
});
