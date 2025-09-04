# Yargısal Zeka — AKS Kubernetes Manifests

Bu klasör, AKS üzerinde uygulamayı çalıştırmak için hazır Deployment, Service, Ingress ve HPA YAML’larını içerir.

Ön koşullar:
- Namespace: yargisalzeka (varsa atlanır)
- ACR: velikececi-e8ada5d7hzfhc0g9.azurecr.io (images push edildi)
- Secrets/ConfigMap: `app-secrets`, `db-connections`, `app-config`
- OpenSearch: `StatefulSet opensearch` ve `Service opensearch` (deploy edildi)
- NGINX Ingress + cert-manager kurulu (Helm ile)

Uygulama:
```bash
# Tüm manifestleri uygula
kubectl apply -f k8s/

# Kontrol
kubectl -n yargisalzeka get pods,svc,ingress,hpa
```

Notlar:
- `ingress-api.yaml` içindeki host’u domaininize göre değiştirin (api.your-domain.com).
- Secrets/ConfigMap yoksa önce oluşturun (README’de daha önceki adımlar).
- ACR farklıysa image alanlarındaki registry’yi güncelleyin.