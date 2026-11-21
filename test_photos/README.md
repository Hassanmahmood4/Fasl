# Fasl test photos

Labelled wheat photos for trying the Fasl scanner by hand: 5 photos for every category the model knows,
except powdery mildew (see below). The folder name is the correct answer. `labels.csv` lists every photo
with its source, licence and original file name.

```
health/
  healthy/  brown_rust/  yellow_rust/  stem_rust/  septoria/  loose_smut/  not_wheat/
stage/
  vegetative/  flowering/  grain_filling/  ripening/
```

## Where the labels come from

Every label comes from the source dataset, not from guessing. Photos were looked at before adding them, and
photos with no visible symptom, watermarks or contradicting notes were left out.

| Category | Source | Licence |
|---|---|---|
| healthy, vegetative | Digital Green, Crop_Disease_Images: farmer photos from India with an expert's note (the note is in `labels.csv`) | CC-BY-4.0 |
| brown_rust (leaf rust), stem_rust, loose_smut | LWDCD 2020, Large-scale Wheat Disease Classification Dataset (via Project-AgML Agri-LLaVA on Hugging Face) | CC0 |
| septoria, yellow_rust (stripe rust), not_wheat | Indian crop diseases dataset on Hugging Face (Khan-Feroz/indian_crop_diseases), test folder | not stated |
| flowering, grain_filling, ripening | Global Wheat Head Dataset 2021, test split; stage set by the GWHD team per field. Flowering = their "post-flowering" | CC-BY-4.0 |

not_wheat holds diseased and healthy leaves of rice, maize, sugarcane, cotton and jute.

## Know before testing

- **Powdery mildew is missing.** No public, labelled wheat powdery mildew photos were found on Hugging Face.
- **Some photos may have been in training.** The septoria and stripe rust leaves look like the Kaggle "Wheat Leaf
  Dataset", and the GWHD photos may be in the `gwhd-stages` upload; both were used to train the model. A correct
  answer on those is a weaker test than on the farmer photos (Digital Green).
- **Some photos are small** (about 140 to 280 px on the short side). The app accepts photos down to 112 px.
- **Stage and health are separate.** Photos in `stage/` are only labelled for stage, and photos in `health/` only for health.

## Credits

- Digital Green, Crop Disease Images, CC-BY-4.0. https://huggingface.co/datasets/DigiGreen/Crop_Disease_Images
- LWDCD 2020, CC0, via https://huggingface.co/datasets/Project-AgML/Agri-LLaVA_Agricultural_Pests_And_Diseases_Feature_Alignment_Dataset
- E. David et al., "Global Wheat Head Detection 2021", Plant Phenomics, 2021, CC-BY-4.0. https://huggingface.co/datasets/sovitrath/GlobalWheatHeadDataset2021
- Indian crop diseases. https://huggingface.co/datasets/Khan-Feroz/indian_crop_diseases
