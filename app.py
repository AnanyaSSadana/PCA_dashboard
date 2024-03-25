from flask import Flask, render_template, jsonify, request
import pandas as pd
import numpy as np
from sklearn.decomposition import PCA
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import KMeans

app = Flask(__name__)

@app.route('/')
def index():
    # Render and serve the index.html template
    return render_template('index.html')

def perform_pca(data, n_components=None):

    scaler = StandardScaler()
    data_standardized = scaler.fit_transform(data)

    pca = PCA(n_components=n_components)
    principalComponents = pca.fit_transform(data_standardized)

    loadings = pca.components_
    explained_variance_ratio = pca.explained_variance_ratio_

    return principalComponents, loadings, explained_variance_ratio

def get_top_attributes(loadings, num_attributes=4):
    # Sum the squares of the loadings for each attribute
    loading_squares = np.square(loadings).sum(axis=0)
    # Get indices of the attributes with the highest sum of squared loadings
    top_indices = np.argsort(-loading_squares)[:num_attributes]
    return top_indices


@app.route('/pca_data')
def pca_data():
    # Load your data
    data = pd.read_csv("./spotify-2023_top500.csv")

    # Clean and preprocess the data for PCA
    data = data.dropna()
    numerical_data = data.select_dtypes(include=[np.number])
    
    # Perform PCA
    principalComponents, loadings, explained_variance_ratio = perform_pca(numerical_data)

    # Prepare data for the scree plot
    scree_data = {
        'explained_variance_ratio': explained_variance_ratio.tolist(),
        'cumulative_explained_variance': np.cumsum(explained_variance_ratio).tolist(),
    }

    return jsonify(scree_data)

@app.route('/biplot_scatterplot_data', methods=['POST'])
def biplot_scatterplot_data():
    dimensionality_index = request.json.get('dimensionalityIndex', 2)
    data = pd.read_csv("./spotify-2023_top500.csv")
    data = data.dropna()
    # Extract track names for labeling in the biplot
    track_names = data['track_name'].tolist()
    numerical_data = data.select_dtypes(include=[np.number])

    # Perform PCA with the selected number of components
    principalComponents, loadings, explained_variance_ratio = perform_pca(numerical_data, n_components=dimensionality_index)

    # Calculate the top attributes based on the sum of squared loadings for each attribute across all components
    sum_of_squared_loadings = np.sum(loadings ** 2, axis=0)
    top_attributes_indices = np.argsort(-sum_of_squared_loadings)[:4]
    top_attributes_names = numerical_data.columns[top_attributes_indices].tolist()
    top_attributes_sos = sum_of_squared_loadings[top_attributes_indices].tolist()

    # Prepare biplot data, containing only the scores for the first two principal components for visualization
    biplot_visualization_data = {
        'scores': principalComponents[:, :2].tolist(),
        'loadings': loadings[:2, :].tolist(),  # Transposed loadings for visualization
        'explained_variance_ratio': explained_variance_ratio[:2].tolist(),  # Variance for the first two PCs
        'feature_names': numerical_data.columns.tolist(),
        'observation_names': track_names  # Assuming the index of the dataframe is meaningful
    }

    # Prepare data for the scatterplot matrix
    top_attributes_data = numerical_data.iloc[:, top_attributes_indices]
    scatterplot_matrix_data = {
        'attributes': top_attributes_names,
        'data': top_attributes_data.to_dict(orient='records')
    }

    # Combine biplot and scatterplot matrix data
    combined_data = {
        'biplot': biplot_visualization_data,
        'scatterplot_matrix': scatterplot_matrix_data,
        'sum_of_squared_loadings': top_attributes_sos
    }

    return jsonify(combined_data)


@app.route('/kmeans', methods=['POST'])
def kmeans():
    k_range = request.json.get('kRange', list(range(1, 11)))
    dimensionality_index = request.json.get('dimensionalityIndex', 2)  # Added this line
    data = pd.read_csv("./spotify-2023_top500.csv")
    data = data.dropna()
    numerical_data = data.select_dtypes(include=[np.number])

    # Perform PCA with the selected number of components
    principalComponents, _, _ = perform_pca(numerical_data, n_components=dimensionality_index)
    # Use only the selected components for k-means
    pca_data_for_clustering = principalComponents[:, :dimensionality_index]

    inertia_scores = []
    cluster_labels_dict = {}
    for k in k_range:
        kmeans = KMeans(n_clusters=k, random_state=0).fit(pca_data_for_clustering)
        inertia_scores.append(kmeans.inertia_)
        cluster_labels_dict[k] = kmeans.labels_.tolist()

    return jsonify({'inertia_scores': inertia_scores,
                    'cluster_labels_dict': cluster_labels_dict})



if __name__ == '__main__':
    app.run(debug=True)
